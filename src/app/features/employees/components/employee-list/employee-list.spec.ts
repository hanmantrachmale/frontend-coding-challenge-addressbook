import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Employee, SortDirection } from '../../data/employee.model';
import { EmployeeList } from './employee-list';

function buildEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    firstName: 'Priya',
    lastName: 'Sharma',
    department: 'Engineering',
    phoneNumber: '+61 2 9000 0001',
    ...overrides,
  };
}

const PRIYA = buildEmployee();
const LIAM = buildEmployee({
  id: 'emp-2',
  firstName: 'Liam',
  lastName: "O'Brien",
  department: 'Finance',
  phoneNumber: '+61 2 9000 0002',
});

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let element: HTMLElement;

  async function render(
    employees: readonly Employee[],
    totalCount = employees.length,
    sort: SortDirection = 'asc',
  ): Promise<void> {
    fixture = TestBed.createComponent(EmployeeList);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('employees', employees);
    fixture.componentRef.setInput('totalCount', totalCount);
    fixture.componentRef.setInput('sort', sort);
    await fixture.whenStable();
  }

  function rows(): HTMLTableRowElement[] {
    return Array.from(element.querySelectorAll('tbody tr'));
  }

  function cellTexts(row: HTMLTableRowElement): string[] {
    return Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent?.trim() ?? '');
  }

  function button(label: string): HTMLButtonElement | null {
    return element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }

  async function click(target: HTMLButtonElement | null): Promise<void> {
    target?.click();
    await fixture.whenStable();
  }

  function captureDeleted(): string[] {
    const deleted: string[] = [];
    fixture.componentInstance.delete.subscribe((id) => deleted.push(id));
    return deleted;
  }

  describe('display', () => {
    it('shows first name, last name, department and phone number columns in that order', async () => {
      await render([PRIYA]);

      const headers = Array.from(element.querySelectorAll('thead th'), (th) =>
        th.textContent?.trim(),
      );
      expect(headers.slice(0, 4)).toEqual([
        'First name',
        expect.stringContaining('Last name'),
        'Department',
        'Phone number',
      ]);
    });

    it('renders one row per employee with its details', async () => {
      await render([PRIYA, LIAM]);

      expect(rows()).toHaveLength(2);
      expect(cellTexts(rows()[0]).slice(0, 4)).toEqual([
        'Priya',
        'Sharma',
        'Engineering',
        '+61 2 9000 0001',
      ]);
      expect(cellTexts(rows()[1]).slice(0, 4)).toEqual([
        'Liam',
        "O'Brien",
        'Finance',
        '+61 2 9000 0002',
      ]);
    });

    it('keeps the order it is given', async () => {
      await render([LIAM, PRIYA]);

      expect(rows().map((row) => cellTexts(row)[1])).toEqual(["O'Brien", 'Sharma']);
    });

    it('shows the visible and total counts', async () => {
      await render([PRIYA], 5);

      expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
        'Showing 1 of 5 employees',
      );
    });

    it('says there are no employees when the list is empty', async () => {
      await render([], 0);

      expect(element.querySelector('tbody')?.textContent?.trim()).toBe('No employees yet.');
    });

    it('says nothing matches when a search hides every employee', async () => {
      await render([], 5);

      expect(element.querySelector('tbody')?.textContent?.trim()).toBe(
        'No employees match your search.',
      );
    });

    it('renders text content as text, not HTML', async () => {
      await render([buildEmployee({ firstName: '<img src=x onerror=alert(1)>' })]);

      expect(element.querySelector('tbody img')).toBeNull();
      expect(cellTexts(rows()[0])[0]).toBe('<img src=x onerror=alert(1)>');
    });
  });

  describe('edge and boundary cases', () => {
    it('defaults to ascending when no sort is given', async () => {
      fixture = TestBed.createComponent(EmployeeList);
      element = fixture.nativeElement as HTMLElement;
      fixture.componentRef.setInput('employees', [PRIYA]);
      fixture.componentRef.setInput('totalCount', 1);
      await fixture.whenStable();

      expect(element.querySelector('th[aria-sort]')?.getAttribute('aria-sort')).toBe('ascending');
    });

    it('shows a zero count for an empty address book', async () => {
      await render([], 0);

      expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
        'Showing 0 of 0 employees',
      );
    });

    it('renders a single employee', async () => {
      await render([PRIYA]);

      expect(rows()).toHaveLength(1);
      expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
        'Showing 1 of 1 employees',
      );
    });

    it('renders the expected maximum of 1000 employees', async () => {
      const many = Array.from({ length: 1000 }, (_, n) =>
        buildEmployee({ id: `emp-${n}`, lastName: `Name${String(n).padStart(4, '0')}` }),
      );

      await render(many);

      expect(rows()).toHaveLength(1000);
      expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
        'Showing 1000 of 1000 employees',
      );
    });

    it('builds accessible names from accented and apostrophe names', async () => {
      await render([buildEmployee({ firstName: 'Zoë', lastName: "N'Diaye" })]);

      expect(button("Delete Zoë N'Diaye")).not.toBeNull();
    });

    it('shows very long values without truncating them', async () => {
      const department = 'a'.repeat(100);

      await render([buildEmployee({ department })]);

      expect(cellTexts(rows()[0])[2]).toBe(department);
    });
  });

  describe('tracking rows by id', () => {
    it('reuses the existing row element when the list is re-sorted', async () => {
      await render([PRIYA, LIAM]);
      const priyaRow = rows()[0];

      fixture.componentRef.setInput('employees', [LIAM, PRIYA]);
      await fixture.whenStable();

      expect(rows()[1]).toBe(priyaRow);
    });

    it('reuses the remaining row elements when an employee is removed', async () => {
      await render([PRIYA, LIAM]);
      const liamRow = rows()[1];

      fixture.componentRef.setInput('employees', [LIAM]);
      await fixture.whenStable();

      expect(rows()[0]).toBe(liamRow);
    });
  });

  describe('accessibility', () => {
    it('has a caption and column headers with scope', async () => {
      await render([PRIYA]);

      expect(element.querySelector('caption')?.textContent?.trim()).toBe(
        'Employees, sorted by last name A to Z',
      );
      expect(element.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    });

    it('wraps the table in a labelled, keyboard-focusable scroll region for small screens', async () => {
      await render([PRIYA]);

      const region = element.querySelector('.table-scroll');
      expect(region?.getAttribute('role')).toBe('region');
      expect(region?.getAttribute('aria-label')).toBe('Employee table');
      expect(region?.getAttribute('tabindex')).toBe('0');
      expect(region?.querySelector('table')).not.toBeNull();
    });

    it('uses the first name as each row header', async () => {
      await render([PRIYA]);

      expect(rows()[0].querySelector('th[scope="row"]')?.textContent?.trim()).toBe('Priya');
    });

    it('announces the result count politely', async () => {
      await render([PRIYA]);

      expect(element.querySelector('.summary')?.getAttribute('aria-live')).toBe('polite');
    });

    it('gives each delete button an accessible name that includes the visible text and the employee', async () => {
      await render([PRIYA]);

      expect(button('Delete Priya Sharma')?.textContent?.trim()).toBe('Delete');
    });
  });

  describe('sorting by last name', () => {
    it('marks the last name column as sorted ascending', async () => {
      await render([PRIYA], 1, 'asc');

      const header = element.querySelector('th[aria-sort]');
      expect(header?.getAttribute('aria-sort')).toBe('ascending');
      expect(header?.textContent).toContain('Last name');
    });

    it('marks the last name column as sorted descending', async () => {
      await render([PRIYA], 1, 'desc');

      expect(element.querySelector('th[aria-sort]')?.getAttribute('aria-sort')).toBe('descending');
      expect(element.querySelector('caption')?.textContent?.trim()).toBe(
        'Employees, sorted by last name Z to A',
      );
    });

    it.each([
      ['asc', 'desc'],
      ['desc', 'asc'],
    ] as const)('requests %s → %s when the header is activated', async (current, next) => {
      await render([PRIYA], 1, current);
      const requested: SortDirection[] = [];
      fixture.componentInstance.sortChange.subscribe((direction) => requested.push(direction));

      await click(element.querySelector<HTMLButtonElement>('.sort-button'));

      expect(requested).toEqual([next]);
    });

    it('is a real button so it works from the keyboard', async () => {
      await render([PRIYA]);

      expect(element.querySelector('.sort-button')?.tagName).toBe('BUTTON');
      expect(element.querySelector<HTMLButtonElement>('.sort-button')?.type).toBe('button');
    });

    it('hides the arrow icon from screen readers', async () => {
      await render([PRIYA]);

      expect(element.querySelector('.sort-button span')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('deleting', () => {
    it('asks for confirmation instead of deleting immediately', async () => {
      await render([PRIYA, LIAM]);
      const deleted = captureDeleted();

      await click(button('Delete Priya Sharma'));

      expect(deleted).toEqual([]);
      expect(button('Confirm delete Priya Sharma')).not.toBeNull();
      expect(button('Cancel delete Priya Sharma')).not.toBeNull();
      expect(button('Delete Priya Sharma')).toBeNull();
    });

    it('only shows the confirmation on the chosen row', async () => {
      await render([PRIYA, LIAM]);

      await click(button('Delete Priya Sharma'));

      expect(button("Delete Liam O'Brien")).not.toBeNull();
      expect(button("Confirm delete Liam O'Brien")).toBeNull();
    });

    it('moves focus to the Confirm button', async () => {
      await render([PRIYA]);

      await click(button('Delete Priya Sharma'));

      expect(document.activeElement).toBe(button('Confirm delete Priya Sharma'));
    });

    it('emits the employee id once confirmed', async () => {
      await render([PRIYA, LIAM]);
      const deleted = captureDeleted();

      await click(button("Delete Liam O'Brien"));
      await click(button("Confirm delete Liam O'Brien"));

      expect(deleted).toEqual(['emp-2']);
    });

    it('announces the deletion and moves focus to the result summary', async () => {
      await render([PRIYA]);

      await click(button('Delete Priya Sharma'));
      await click(button('Confirm delete Priya Sharma'));

      expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe(
        'Deleted Priya Sharma.',
      );
      expect(document.activeElement).toBe(element.querySelector('.summary'));
    });

    it('does not emit and restores the Delete button when cancelled', async () => {
      await render([PRIYA]);
      const deleted = captureDeleted();

      await click(button('Delete Priya Sharma'));
      await click(button('Cancel delete Priya Sharma'));

      expect(deleted).toEqual([]);
      expect(button('Delete Priya Sharma')).not.toBeNull();
      expect(document.activeElement).toBe(button('Delete Priya Sharma'));
    });

    it('cancels with the Escape key', async () => {
      await render([PRIYA]);
      const deleted = captureDeleted();
      await click(button('Delete Priya Sharma'));

      button('Confirm delete Priya Sharma')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await fixture.whenStable();

      expect(deleted).toEqual([]);
      expect(document.activeElement).toBe(button('Delete Priya Sharma'));
    });

    it('cancels with the Escape key from the Cancel button too', async () => {
      await render([PRIYA]);
      await click(button('Delete Priya Sharma'));

      button('Cancel delete Priya Sharma')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await fixture.whenStable();

      expect(button('Delete Priya Sharma')).not.toBeNull();
    });

    it('replaces the status message on a second deletion', async () => {
      await render([PRIYA, LIAM]);

      await click(button('Delete Priya Sharma'));
      await click(button('Confirm delete Priya Sharma'));
      await click(button("Delete Liam O'Brien"));
      await click(button("Confirm delete Liam O'Brien"));

      expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe(
        "Deleted Liam O'Brien.",
      );
    });

    it('keeps the confirmation on the same employee when the rows are re-sorted', async () => {
      await render([PRIYA, LIAM]);
      await click(button('Delete Priya Sharma'));

      fixture.componentRef.setInput('employees', [LIAM, PRIYA]);
      await fixture.whenStable();

      expect(button('Confirm delete Priya Sharma')).not.toBeNull();
      expect(button("Delete Liam O'Brien")).not.toBeNull();
    });

    describe('focus after deletion', () => {
      const MARIA = buildEmployee({ id: 'emp-3', firstName: 'Maria', lastName: 'Garcia' });

      async function confirmDeleteAndRemove(
        employees: readonly Employee[],
        target: Employee,
      ): Promise<void> {
        await render(employees);
        fixture.componentInstance.delete.subscribe((id) =>
          fixture.componentRef.setInput(
            'employees',
            employees.filter((employee) => employee.id !== id),
          ),
        );
        await click(button(`Delete ${target.firstName} ${target.lastName}`));
        await click(button(`Confirm delete ${target.firstName} ${target.lastName}`));
      }

      it('moves to the next row', async () => {
        await confirmDeleteAndRemove([PRIYA, LIAM, MARIA], LIAM);

        expect(document.activeElement).toBe(button('Delete Maria Garcia'));
      });

      it('moves to the previous row when the last row is deleted', async () => {
        await confirmDeleteAndRemove([PRIYA, LIAM], LIAM);

        expect(document.activeElement).toBe(button('Delete Priya Sharma'));
      });

      it('moves to the result summary when the list becomes empty', async () => {
        await confirmDeleteAndRemove([PRIYA], PRIYA);

        expect(element.querySelector('tbody .empty')).not.toBeNull();
        expect(document.activeElement).toBe(element.querySelector('.summary'));
      });
    });

    it('announces a second deletion of someone with the same name', async () => {
      const twin = buildEmployee({ id: 'emp-9' });
      await render([PRIYA, twin]);

      await click(
        element.querySelectorAll<HTMLButtonElement>('button[aria-label="Delete Priya Sharma"]')[0],
      );
      await click(button('Confirm delete Priya Sharma'));
      const status = element.querySelector('[role="status"]');
      const previousValues: (string | undefined)[] = [];
      const observer = new MutationObserver((records) =>
        previousValues.push(...records.map((record) => record.oldValue?.trim())),
      );
      observer.observe(status as Node, {
        characterData: true,
        characterDataOldValue: true,
        subtree: true,
      });

      await click(
        element.querySelectorAll<HTMLButtonElement>('button[aria-label="Delete Priya Sharma"]')[1],
      );
      await click(button('Confirm delete Priya Sharma'));
      observer.disconnect();

      // The text is emptied and then set again, so assistive technology sees a change and re-announces it.
      expect(previousValues).toContain('');
      expect(status?.textContent?.trim()).toBe('Deleted Priya Sharma.');
    });

    it('drops a pending confirmation when that employee is hidden, so it does not reappear', async () => {
      await render([PRIYA, LIAM]);
      await click(button('Delete Priya Sharma'));

      fixture.componentRef.setInput('employees', [LIAM]);
      await fixture.whenStable();
      fixture.componentRef.setInput('employees', [PRIYA, LIAM]);
      await fixture.whenStable();

      expect(button('Confirm delete Priya Sharma')).toBeNull();
      expect(button('Delete Priya Sharma')).not.toBeNull();
    });

    it('moves the confirmation when Delete is chosen on another row', async () => {
      await render([PRIYA, LIAM]);

      await click(button('Delete Priya Sharma'));
      await click(button("Delete Liam O'Brien"));

      expect(button('Delete Priya Sharma')).not.toBeNull();
      expect(button("Confirm delete Liam O'Brien")).not.toBeNull();
    });
  });
});
