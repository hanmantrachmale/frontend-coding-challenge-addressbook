import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchPanel } from './search-panel';

describe('SearchPanel', () => {
  let fixture: ComponentFixture<SearchPanel>;
  let panel: SearchPanel;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SearchPanel);
    panel = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function nameInput(): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('#search-name') as HTMLInputElement;
  }

  function departmentInput(): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('#search-department') as HTMLInputElement;
  }

  function clearButton(): HTMLButtonElement | null {
    return element.querySelector<HTMLButtonElement>('button.clear');
  }

  async function type(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  describe('accessibility', () => {
    it('is a search landmark with an accessible name', () => {
      const form = element.querySelector('form');

      expect(form?.getAttribute('role')).toBe('search');
      expect(form?.getAttribute('aria-label')).toBe('Search employees');
    });

    it.each([
      ['search-name', 'Name'],
      ['search-department', 'Department'],
    ])('labels #%s as "%s"', (id, label) => {
      expect(element.querySelector(`label[for="${id}"]`)?.textContent?.trim()).toBe(label);
    });

    it('uses search inputs described by a hint', () => {
      for (const input of [nameInput(), departmentInput()]) {
        const hintId = input.getAttribute('aria-describedby');

        expect(input.type).toBe('search');
        expect(hintId).toBeTruthy();
        expect(element.querySelector(`#${hintId}`)?.textContent?.trim()).not.toBe('');
      }
    });

    it('gives the clear button a visible text label', async () => {
      await type(nameInput(), 'Priya');

      expect(clearButton()?.textContent?.trim()).toBe('Clear search');
      expect(clearButton()?.type).toBe('button');
    });
  });

  describe('state from the parent', () => {
    it('shows the name and department it is given', async () => {
      fixture.componentRef.setInput('name', 'Priya');
      fixture.componentRef.setInput('department', 'Engineering');
      await fixture.whenStable();

      expect(nameInput().value).toBe('Priya');
      expect(departmentInput().value).toBe('Engineering');
      expect(panel.criteria()).toEqual({ name: 'Priya', department: 'Engineering' });
    });

    it('starts empty and inactive', () => {
      expect(nameInput().value).toBe('');
      expect(departmentInput().value).toBe('');
      expect(panel.isActive()).toBe(false);
      expect(clearButton()).toBeNull();
    });
  });

  describe('typing', () => {
    it('updates and emits the name as the user types', async () => {
      const emitted: string[] = [];
      panel.name.subscribe((value) => emitted.push(value));

      await type(nameInput(), 'Pri');

      expect(panel.name()).toBe('Pri');
      expect(emitted).toEqual(['Pri']);
    });

    it('updates and emits the department as the user types', async () => {
      const emitted: string[] = [];
      panel.department.subscribe((value) => emitted.push(value));

      await type(departmentInput(), 'eng');

      expect(panel.department()).toBe('eng');
      expect(emitted).toEqual(['eng']);
    });

    it('exposes both searches through criteria', async () => {
      await type(nameInput(), 'erik');
      await type(departmentInput(), 'eng');

      expect(panel.criteria()).toEqual({ name: 'erik', department: 'eng' });
    });

    it('keeps the text exactly as typed, leaving trimming to the search', async () => {
      await type(nameInput(), '  Priya ');

      expect(panel.name()).toBe('  Priya ');
    });
  });

  describe('active state', () => {
    it.each([
      ['a name', 'Priya', ''],
      ['a department', '', 'Finance'],
      ['both', 'Priya', 'Finance'],
    ])('is active with %s', async (_case, name, department) => {
      await type(nameInput(), name);
      await type(departmentInput(), department);

      expect(panel.isActive()).toBe(true);
      expect(clearButton()).not.toBeNull();
    });

    it('is not active with whitespace only', async () => {
      await type(nameInput(), '   ');
      await type(departmentInput(), ' ');

      expect(panel.isActive()).toBe(false);
      expect(clearButton()).toBeNull();
    });
  });

  describe('clearing', () => {
    it('clears both searches, emits empty values and hides the button', async () => {
      const names: string[] = [];
      const departments: string[] = [];
      await type(nameInput(), 'Priya');
      await type(departmentInput(), 'Engineering');
      panel.name.subscribe((value) => names.push(value));
      panel.department.subscribe((value) => departments.push(value));

      clearButton()?.click();
      await fixture.whenStable();

      expect(panel.criteria()).toEqual({ name: '', department: '' });
      expect(nameInput().value).toBe('');
      expect(departmentInput().value).toBe('');
      expect(names).toEqual(['']);
      expect(departments).toEqual(['']);
      expect(clearButton()).toBeNull();
    });

    it('moves focus to the name box so focus is not lost', async () => {
      await type(departmentInput(), 'Finance');

      clearButton()?.click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(nameInput());
    });
  });

  describe('edge and boundary cases', () => {
    it('becomes active with a single character', async () => {
      await type(nameInput(), 'a');

      expect(panel.isActive()).toBe(true);
    });

    it.each(['\t', ' \t ', ' '])('treats %j as no search', async (value) => {
      fixture.componentRef.setInput('name', value);
      fixture.componentRef.setInput('department', value);
      await fixture.whenStable();

      expect(panel.isActive()).toBe(false);
      expect(clearButton()).toBeNull();
    });

    it.each(["O'Brien", '.*(', '<script>', 'Åberg', 'a'.repeat(500)])(
      'passes %j through unchanged',
      async (value) => {
        await type(nameInput(), value);

        expect(panel.name()).toBe(value);
      },
    );

    it('shows a value set by the parent after the user has typed', async () => {
      await type(nameInput(), 'typed');

      fixture.componentRef.setInput('name', 'from parent');
      await fixture.whenStable();

      expect(nameInput().value).toBe('from parent');
      expect(panel.name()).toBe('from parent');
    });

    it('clears when only the department is set', async () => {
      await type(departmentInput(), 'Finance');

      clearButton()?.click();
      await fixture.whenStable();

      expect(panel.criteria()).toEqual({ name: '', department: '' });
      expect(document.activeElement).toBe(nameInput());
    });

    it('produces a new criteria value for each change', async () => {
      const before = panel.criteria();

      await type(nameInput(), 'P');

      expect(panel.criteria()).not.toBe(before);
      expect(before).toEqual({ name: '', department: '' });
    });
  });

  it('prevents Enter from submitting the form and reloading the page', () => {
    const submit = new Event('submit', { cancelable: true });

    element.querySelector('form')?.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
  });
});
