import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeValidationError, NewEmployee } from '../../data/employee.model';
import { EMPLOYEE_SEED } from '../../data/employee.seed';
import { EmployeeService } from '../../data/employee.service';
import { EmployeePage } from './employee-page';

const FORM_IDS: Readonly<Record<keyof NewEmployee, string>> = {
  firstName: 'employee-first-name',
  lastName: 'employee-last-name',
  department: 'employee-department',
  phoneNumber: 'employee-phone-number',
};

const NEW_EMPLOYEE: NewEmployee = {
  firstName: 'Ana',
  lastName: 'Lopez',
  department: 'Sales',
  phoneNumber: '+61 2 9000 0100',
};

describe('EmployeePage', () => {
  let fixture: ComponentFixture<EmployeePage>;
  let element: HTMLElement;
  let service: EmployeeService;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmployeePage);
    element = fixture.nativeElement as HTMLElement;
    service = TestBed.inject(EmployeeService);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function input(id: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`#${id}`) as HTMLInputElement;
  }

  async function type(id: string, value: string): Promise<void> {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(selector: string): Promise<void> {
    element.querySelector<HTMLButtonElement>(selector)?.click();
    await fixture.whenStable();
  }

  async function submitNewEmployee(values: NewEmployee): Promise<void> {
    for (const field of Object.keys(FORM_IDS) as (keyof NewEmployee)[]) {
      await type(FORM_IDS[field], values[field]);
    }
    await click('app-employee-form button[type="submit"]');
  }

  function rowLastNames(): string[] {
    return Array.from(
      element.querySelectorAll('tbody tr'),
      (row) => row.querySelector('td')?.textContent?.trim() ?? '',
    );
  }

  function statusText(): string {
    return element.querySelector('#add-employee [role="status"]')?.textContent?.trim() ?? '';
  }

  describe('structure', () => {
    it('has one page heading and a labelled section for each task', () => {
      expect(element.querySelectorAll('h1')).toHaveLength(1);
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Employees');
      expect(
        element.querySelector('section[aria-labelledby="add-employee-heading"] app-employee-form'),
      ).not.toBeNull();
      expect(
        element.querySelector('section[aria-labelledby="directory-heading"] app-search-panel'),
      ).not.toBeNull();
      expect(
        element.querySelector('section[aria-labelledby="directory-heading"] app-employee-list'),
      ).not.toBeNull();
    });

    it('gives the add section the id the header link points to', () => {
      expect(element.querySelector('#add-employee h2')?.textContent?.trim()).toBe('Add employee');
    });
  });

  describe('employee list', () => {
    it('shows every employee sorted by last name', () => {
      expect(rowLastNames()).toEqual(['Åberg', 'de Vries', 'Garcia', "O'Brien", 'Sharma']);
    });

    it('reverses the sort from the Last name header', async () => {
      await click('.sort-button');

      expect(service.filter().sort).toBe('desc');
      expect(rowLastNames()).toEqual(['Sharma', "O'Brien", 'Garcia', 'de Vries', 'Åberg']);
    });

    it('deletes an employee after confirmation', async () => {
      await click('button[aria-label="Delete Maria Garcia"]');
      await click('button[aria-label="Confirm delete Maria Garcia"]');

      expect(service.count()).toBe(EMPLOYEE_SEED.length - 1);
      expect(rowLastNames()).not.toContain('Garcia');
    });
  });

  describe('search', () => {
    it('filters by name through the service', async () => {
      await type('search-name', 'sanne');

      expect(service.filter().name).toBe('sanne');
      expect(rowLastNames()).toEqual(['de Vries']);
    });

    it('filters by department through the service', async () => {
      await type('search-department', 'engineering');

      expect(rowLastNames()).toEqual(['Åberg', 'Sharma']);
    });

    it('shows searches held in the service', async () => {
      service.searchByName('Liam');
      service.searchByDepartment('Fin');
      await fixture.whenStable();

      expect(input('search-name').value).toBe('Liam');
      expect(input('search-department').value).toBe('Fin');
      expect(rowLastNames()).toEqual(["O'Brien"]);
    });

    it('keeps the search boxes unchanged when only the sort changes', async () => {
      await type('search-name', 'a');
      const nameBox = input('search-name');

      await click('.sort-button');

      expect(input('search-name')).toBe(nameBox);
      expect(nameBox.value).toBe('a');
    });
  });

  describe('adding an employee', () => {
    it('adds the employee to the list in surname order', async () => {
      await submitNewEmployee(NEW_EMPLOYEE);

      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
      expect(rowLastNames()).toEqual(['Åberg', 'de Vries', 'Garcia', 'Lopez', "O'Brien", 'Sharma']);
    });

    it('stores trimmed values', async () => {
      await submitNewEmployee({ ...NEW_EMPLOYEE, firstName: '  Ana  ', department: ' Sales ' });

      const added = service.employees().at(-1);
      expect(added?.firstName).toBe('Ana');
      expect(added?.department).toBe('Sales');
    });

    it('announces the new employee', async () => {
      await submitNewEmployee(NEW_EMPLOYEE);

      expect(statusText()).toBe('Added Ana Lopez.');
    });

    it('says when the new employee is hidden by the current search', async () => {
      await type('search-name', 'priya');

      await submitNewEmployee(NEW_EMPLOYEE);

      expect(statusText()).toBe('Added Ana Lopez. They are hidden by the current search.');
      expect(rowLastNames()).toEqual(['Sharma']);
    });

    it('empties the form, without errors, and focuses the first field for the next entry', async () => {
      await submitNewEmployee(NEW_EMPLOYEE);

      for (const id of Object.values(FORM_IDS)) {
        expect(input(id).value).toBe('');
      }
      expect(element.querySelectorAll('app-employee-form .error')).toHaveLength(0);
      expect(document.activeElement).toBe(input(FORM_IDS.firstName));
    });

    it('does not add anything when the form is invalid', async () => {
      await submitNewEmployee({ ...NEW_EMPLOYEE, phoneNumber: 'abc' });

      expect(service.count()).toBe(EMPLOYEE_SEED.length);
      expect(statusText()).toBe('');
      expect(input(FORM_IDS.firstName).value).toBe('Ana');
    });

    it('shows an alert and keeps the entered values if the service rejects the employee', async () => {
      vi.spyOn(service, 'addEmployee').mockImplementation(() => {
        throw new EmployeeValidationError([{ field: 'lastName', code: 'required' }]);
      });

      await submitNewEmployee(NEW_EMPLOYEE);

      expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        'The employee could not be added. Please check the details and try again.',
      );
      expect(statusText()).toBe('');
      expect(input(FORM_IDS.lastName).value).toBe('Lopez');
    });

    it('clears a previous alert after a successful add', async () => {
      const addEmployee = service.addEmployee.bind(service);
      vi.spyOn(service, 'addEmployee')
        .mockImplementationOnce(() => {
          throw new EmployeeValidationError([{ field: 'lastName', code: 'required' }]);
        })
        .mockImplementation(addEmployee);

      await submitNewEmployee(NEW_EMPLOYEE);
      await click('app-employee-form button[type="submit"]');

      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(statusText()).toBe('Added Ana Lopez.');
    });

    it('shows no errors after adding with Enter while a field still has focus', async () => {
      for (const field of Object.keys(FORM_IDS) as (keyof NewEmployee)[]) {
        await type(FORM_IDS[field], NEW_EMPLOYEE[field]);
      }
      input(FORM_IDS.phoneNumber).focus();

      element
        .querySelector('app-employee-form form')
        ?.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();

      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
      expect(element.querySelectorAll('app-employee-form .error')).toHaveLength(0);
      expect(input(FORM_IDS.phoneNumber).hasAttribute('aria-invalid')).toBe(false);
      expect(document.activeElement).toBe(input(FORM_IDS.firstName));
    });

    it('clears validation errors on Cancel after a failed submit', async () => {
      await click('app-employee-form button[type="submit"]');
      expect(element.querySelectorAll('app-employee-form .error')).toHaveLength(4);

      await click('app-employee-form button[type="button"]');

      expect(element.querySelectorAll('app-employee-form .error')).toHaveLength(0);
      expect(input(FORM_IDS.firstName).hasAttribute('aria-invalid')).toBe(false);
    });

    it('clears the form and messages on Cancel', async () => {
      await submitNewEmployee(NEW_EMPLOYEE);
      await type(FORM_IDS.firstName, 'Half typed');

      await click('app-employee-form button[type="button"]');

      expect(input(FORM_IDS.firstName).value).toBe('');
      expect(statusText()).toBe('');
      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
    });
  });
});
