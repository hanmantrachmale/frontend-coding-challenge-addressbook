import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_EMPLOYEE_FILTER,
  Employee,
  EmployeeValidationError,
  NewEmployee,
} from './employee.model';
import { EMPLOYEE_SEED } from './employee.seed';
import { EmployeeService } from './employee.service';

const UUID_1 = '00000000-0000-4000-8000-000000000001';
const UUID_2 = '00000000-0000-4000-8000-000000000002';

function buildNewEmployee(overrides: Partial<NewEmployee> = {}): NewEmployee {
  return {
    firstName: 'Ana',
    lastName: 'Lopez',
    department: 'Sales',
    phoneNumber: '+61 2 9000 0100',
    ...overrides,
  };
}

function lastNames(employees: readonly Employee[]): string[] {
  return employees.map((employee) => employee.lastName);
}

function fullNames(employees: readonly Employee[]): string[] {
  return employees.map((employee) => `${employee.firstName} ${employee.lastName}`);
}

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    service = TestBed.inject(EmployeeService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with the seed employees in insertion order', () => {
      expect(service.employees()).toEqual(EMPLOYEE_SEED);
    });

    it('reports the number of employees', () => {
      expect(service.count()).toBe(EMPLOYEE_SEED.length);
    });

    it('starts with the default filter', () => {
      expect(service.filter()).toEqual(DEFAULT_EMPLOYEE_FILTER);
    });

    it('shows every employee sorted by surname A to Z', () => {
      expect(lastNames(service.filteredEmployees())).toEqual([
        'Åberg',
        'de Vries',
        'Garcia',
        "O'Brien",
        'Sharma',
      ]);
    });
  });

  describe('addEmployee', () => {
    it('appends the employee with a generated id and returns it', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(UUID_1);

      const added = service.addEmployee(buildNewEmployee());

      expect(added).toEqual({ id: UUID_1, ...buildNewEmployee() });
      expect(service.employees().at(-1)).toBe(added);
      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
    });

    it('stores trimmed values', () => {
      const added = service.addEmployee(
        buildNewEmployee({ firstName: '  Ana ', department: ' Sales  ' }),
      );

      expect(added.firstName).toBe('Ana');
      expect(added.department).toBe('Sales');
    });

    it('replaces the employees array instead of mutating it', () => {
      const before = service.employees();

      service.addEmployee(buildNewEmployee());

      expect(service.employees()).not.toBe(before);
      expect(before).toEqual(EMPLOYEE_SEED);
    });

    it('gives employees with identical details different ids', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(UUID_1).mockReturnValueOnce(UUID_2);

      const first = service.addEmployee(buildNewEmployee());
      const second = service.addEmployee(buildNewEmployee());

      expect(first.id).not.toBe(second.id);
      expect(service.count()).toBe(EMPLOYEE_SEED.length + 2);
    });

    it('throws a validation error and leaves state unchanged for invalid data', () => {
      const before = service.employees();

      expect(() => service.addEmployee(buildNewEmployee({ lastName: '   ' }))).toThrow(
        EmployeeValidationError,
      );
      expect(service.employees()).toBe(before);
    });

    it('includes the new employee in the filtered list in sorted position', () => {
      service.addEmployee(buildNewEmployee({ lastName: 'Lopez' }));

      expect(lastNames(service.filteredEmployees())).toEqual([
        'Åberg',
        'de Vries',
        'Garcia',
        'Lopez',
        "O'Brien",
        'Sharma',
      ]);
    });
  });

  describe('deleteEmployee', () => {
    it('removes only the matching employee and keeps the order of the rest', () => {
      const removed = service.deleteEmployee('seed-0002');

      expect(removed).toBe(true);
      expect(service.employees()).toEqual(
        EMPLOYEE_SEED.filter((employee) => employee.id !== 'seed-0002'),
      );
    });

    it('replaces the employees array instead of mutating it', () => {
      const before = service.employees();

      service.deleteEmployee('seed-0001');

      expect(service.employees()).not.toBe(before);
      expect(before).toEqual(EMPLOYEE_SEED);
    });

    it('returns false and keeps the same array for an unknown id', () => {
      const before = service.employees();

      expect(service.deleteEmployee('missing-id')).toBe(false);
      expect(service.employees()).toBe(before);
    });

    it('returns false when the same employee is deleted twice', () => {
      service.deleteEmployee('seed-0001');

      expect(service.deleteEmployee('seed-0001')).toBe(false);
      expect(service.count()).toBe(EMPLOYEE_SEED.length - 1);
    });

    it('leaves an empty list after deleting every employee', () => {
      for (const employee of EMPLOYEE_SEED) {
        service.deleteEmployee(employee.id);
      }

      expect(service.employees()).toEqual([]);
      expect(service.count()).toBe(0);
      expect(service.filteredEmployees()).toEqual([]);
    });

    it('removes the employee from the filtered list', () => {
      service.deleteEmployee('seed-0004');

      expect(lastNames(service.filteredEmployees())).not.toContain('Åberg');
    });

    it('can delete an employee that was just added', () => {
      const added = service.addEmployee(buildNewEmployee());

      expect(service.deleteEmployee(added.id)).toBe(true);
      expect(service.employees()).toEqual(EMPLOYEE_SEED);
    });
  });

  describe('searchByName', () => {
    it.each([
      ['first name', 'Priya', ['Priya Sharma']],
      ['last name', 'Garcia', ['Maria Garcia']],
      ['full name', "Liam O'Brien", ["Liam O'Brien"]],
      ['partial name', 'ar', ['Maria Garcia', 'Priya Sharma']],
      ['name with a particle', 'de vr', ['Sanne de Vries']],
      ['upper case', 'SHARMA', ['Priya Sharma']],
      ['no accent for an accented name', 'aberg', ['Erik Åberg']],
      ['accent for an accented name', 'Åberg', ['Erik Åberg']],
      ['surrounding whitespace', '  Priya  ', ['Priya Sharma']],
    ])('matches by %s', (_case, query, expected) => {
      service.searchByName(query);

      expect(fullNames(service.filteredEmployees())).toEqual(expected);
    });

    it.each(['', '   '])('shows every employee for a blank query (%j)', (query) => {
      service.searchByName('Priya');
      service.searchByName(query);

      expect(service.filteredEmployees()).toHaveLength(EMPLOYEE_SEED.length);
    });

    it('returns an empty list when nothing matches', () => {
      service.searchByName('Nobody');

      expect(service.filteredEmployees()).toEqual([]);
    });

    it.each(['.*', '(', '[a-z]', '\\', '$^'])('treats %s as plain text, not a pattern', (query) => {
      service.searchByName(query);

      expect(service.filteredEmployees()).toEqual([]);
    });

    it('does not match the reversed full name', () => {
      service.searchByName('Sharma Priya');

      expect(service.filteredEmployees()).toEqual([]);
    });

    it('stores the raw query and replaces the filter object', () => {
      const before = service.filter();

      service.searchByName('  Priya ');

      expect(service.filter()).toEqual({ ...DEFAULT_EMPLOYEE_FILTER, name: '  Priya ' });
      expect(service.filter()).not.toBe(before);
      expect(before).toEqual(DEFAULT_EMPLOYEE_FILTER);
    });

    it('does not change the stored employees', () => {
      const before = service.employees();

      service.searchByName('Priya');

      expect(service.employees()).toBe(before);
    });
  });

  describe('searchByDepartment', () => {
    it('returns every employee in the department, sorted by surname', () => {
      service.searchByDepartment('Engineering');

      expect(fullNames(service.filteredEmployees())).toEqual(['Erik Åberg', 'Priya Sharma']);
    });

    it.each(['engineering', 'ENGINEERING', 'eng', '  Engineering  '])('matches %j', (query) => {
      service.searchByDepartment(query);

      expect(lastNames(service.filteredEmployees())).toEqual(['Åberg', 'Sharma']);
    });

    it('matches a multi-word department by any part', () => {
      service.searchByDepartment('resources');

      expect(fullNames(service.filteredEmployees())).toEqual(['Maria Garcia']);
    });

    it.each(['', '   '])('shows every employee for a blank department (%j)', (department) => {
      service.searchByDepartment('Finance');
      service.searchByDepartment(department);

      expect(service.filteredEmployees()).toHaveLength(EMPLOYEE_SEED.length);
    });

    it('returns an empty list for an unknown department', () => {
      service.searchByDepartment('Legal');

      expect(service.filteredEmployees()).toEqual([]);
    });

    it('applies together with the name search', () => {
      service.searchByName('erik');
      service.searchByDepartment('eng');

      expect(fullNames(service.filteredEmployees())).toEqual(['Erik Åberg']);
    });

    it('returns an empty list when name and department match different employees', () => {
      service.searchByName('Priya');
      service.searchByDepartment('Finance');

      expect(service.filteredEmployees()).toEqual([]);
    });

    it('keeps the name search when the department changes', () => {
      service.searchByName('Priya');
      service.searchByDepartment('Engineering');

      expect(service.filter()).toEqual({ name: 'Priya', department: 'Engineering', sort: 'asc' });
    });
  });

  describe('addEmployee boundaries', () => {
    it.each([
      ['first name at 50 characters', { firstName: 'a'.repeat(50) }],
      ['last name at 50 characters', { lastName: 'a'.repeat(50) }],
      ['department at 100 characters', { department: 'a'.repeat(100) }],
      ['phone number with 6 digits', { phoneNumber: '123456' }],
      ['phone number with 15 digits', { phoneNumber: '123456789012345' }],
      ['phone number of exactly 20 characters', { phoneNumber: '+61 2 9000 0001 0001' }],
      [
        'names with apostrophes, accents and non-Latin script',
        { firstName: 'Zoë', lastName: "N'Diaye-李" },
      ],
    ])('accepts %s', (_case, overrides: Partial<NewEmployee>) => {
      service.addEmployee(buildNewEmployee(overrides));

      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
    });

    it.each([
      ['first name at 51 characters', { firstName: 'a'.repeat(51) }],
      ['last name at 51 characters', { lastName: 'a'.repeat(51) }],
      ['department at 101 characters', { department: 'a'.repeat(101) }],
      ['phone number with 5 digits', { phoneNumber: '12345' }],
      ['phone number with 16 digits', { phoneNumber: '1234567890123456' }],
      ['phone number of 21 characters', { phoneNumber: '+61 2 9000 0001 00011' }],
    ])('rejects %s and leaves state unchanged', (_case, overrides: Partial<NewEmployee>) => {
      const before = service.employees();

      expect(() => service.addEmployee(buildNewEmployee(overrides))).toThrow(
        EmployeeValidationError,
      );
      expect(service.employees()).toBe(before);
    });

    it('reports every invalid field in one error', () => {
      try {
        service.addEmployee({ firstName: '', lastName: ' ', department: '', phoneNumber: 'x' });
        expect.unreachable('addEmployee should have thrown');
      } catch (error) {
        expect((error as EmployeeValidationError).issues.map((issue) => issue.field)).toEqual([
          'firstName',
          'lastName',
          'department',
          'phoneNumber',
        ]);
      }
    });

    it('can add a valid employee straight after a rejected one', () => {
      expect(() => service.addEmployee(buildNewEmployee({ firstName: '' }))).toThrow(
        EmployeeValidationError,
      );

      const added = service.addEmployee(buildNewEmployee());

      expect(service.employees().at(-1)).toBe(added);
      expect(service.count()).toBe(EMPLOYEE_SEED.length + 1);
    });
  });

  describe('edge cases', () => {
    it('keeps the same filtered array when a search is set to its current value', () => {
      const before = service.filteredEmployees();

      service.searchByName('');
      service.searchByDepartment('');
      service.sortBySurname('asc');

      expect(service.filteredEmployees()).toBe(before);
    });

    it('does not re-filter when only the sort direction changes', () => {
      service.searchByDepartment('eng');
      const ascending = service.filteredEmployees();

      service.sortBySurname('desc');

      expect(service.filteredEmployees()).toEqual([...ascending].reverse());
    });

    it('returns false for an empty id', () => {
      expect(service.deleteEmployee('')).toBe(false);
      expect(service.count()).toBe(EMPLOYEE_SEED.length);
    });

    it('finds an accented name from an unaccented query', () => {
      service.addEmployee(buildNewEmployee({ firstName: 'José', lastName: 'Núñez' }));
      service.searchByName('jose nunez');

      expect(fullNames(service.filteredEmployees())).toEqual(['José Núñez']);
    });

    it('finds an unaccented name from an accented query', () => {
      service.addEmployee(buildNewEmployee({ firstName: 'Jose', lastName: 'Nunez' }));
      service.searchByName('JOSÉ');

      expect(fullNames(service.filteredEmployees())).toEqual(['Jose Nunez']);
    });

    it('finds an accented department from an unaccented query', () => {
      service.addEmployee(buildNewEmployee({ department: 'Ingeniería' }));
      service.searchByDepartment('ingenieria');

      expect(lastNames(service.filteredEmployees())).toEqual(['Lopez']);
    });

    it('matches an apostrophe in a name', () => {
      service.searchByName("o'b");

      expect(fullNames(service.filteredEmployees())).toEqual(["Liam O'Brien"]);
    });

    it('returns an empty list for a very long query without error', () => {
      service.searchByName('a'.repeat(10_000));

      expect(service.filteredEmployees()).toEqual([]);
    });

    it('places a newly added employee correctly when sorted descending', () => {
      service.sortBySurname('desc');

      service.addEmployee(buildNewEmployee({ lastName: 'Lopez' }));

      expect(lastNames(service.filteredEmployees())).toEqual([
        'Sharma',
        "O'Brien",
        'Lopez',
        'Garcia',
        'de Vries',
        'Åberg',
      ]);
    });

    it('drops a deleted employee from an active search result', () => {
      service.searchByDepartment('Engineering');

      service.deleteEmployee('seed-0001');

      expect(lastNames(service.filteredEmployees())).toEqual(['Åberg']);
    });

    it('handles the expected maximum of 1000 employees', () => {
      for (const employee of EMPLOYEE_SEED) {
        service.deleteEmployee(employee.id);
      }
      for (let n = 1000; n >= 1; n--) {
        service.addEmployee(buildNewEmployee({ lastName: `Name${String(n).padStart(4, '0')}` }));
      }

      expect(service.count()).toBe(1000);
      expect(service.filteredEmployees()[0].lastName).toBe('Name0001');
      expect(service.filteredEmployees()[999].lastName).toBe('Name1000');

      service.searchByName('Name0500');
      expect(lastNames(service.filteredEmployees())).toEqual(['Name0500']);
    });

    it('matches a full name typed with extra inner spaces', () => {
      service.searchByName("liam   o'brien");

      expect(fullNames(service.filteredEmployees())).toEqual(["Liam O'Brien"]);
    });

    it('starts from frozen seed records', () => {
      expect(Object.isFrozen(service.employees())).toBe(true);
      expect(service.employees().every((employee) => Object.isFrozen(employee))).toBe(true);
    });
  });

  describe('sortBySurname', () => {
    it('sorts Z to A when descending', () => {
      service.sortBySurname('desc');

      expect(lastNames(service.filteredEmployees())).toEqual([
        'Sharma',
        "O'Brien",
        'Garcia',
        'de Vries',
        'Åberg',
      ]);
    });

    it('sorts A to Z again when switched back to ascending', () => {
      service.sortBySurname('desc');
      service.sortBySurname('asc');

      expect(lastNames(service.filteredEmployees())[0]).toBe('Åberg');
    });

    it('ignores case when comparing surnames', () => {
      service.addEmployee(buildNewEmployee({ lastName: 'brown' }));

      expect(lastNames(service.filteredEmployees()).slice(0, 3)).toEqual([
        'Åberg',
        'brown',
        'de Vries',
      ]);
    });

    it('orders employees with the same surname by first name', () => {
      service.addEmployee(buildNewEmployee({ firstName: 'Zoe', lastName: 'Smith' }));
      service.addEmployee(buildNewEmployee({ firstName: 'Adam', lastName: 'Smith' }));
      service.searchByName('Smith');

      expect(fullNames(service.filteredEmployees())).toEqual(['Adam Smith', 'Zoe Smith']);

      service.sortBySurname('desc');

      expect(fullNames(service.filteredEmployees())).toEqual(['Zoe Smith', 'Adam Smith']);
    });

    it('orders employees with identical names by id so the order is stable', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(UUID_2).mockReturnValueOnce(UUID_1);
      service.addEmployee(buildNewEmployee());
      service.addEmployee(buildNewEmployee());
      service.searchByName('Ana Lopez');

      expect(service.filteredEmployees().map((employee) => employee.id)).toEqual([UUID_1, UUID_2]);
    });

    it('does not reorder the stored employees', () => {
      service.sortBySurname('desc');

      expect(service.employees()).toEqual(EMPLOYEE_SEED);
    });

    it('keeps the name and department searches', () => {
      service.searchByName('a');
      service.searchByDepartment('eng');
      service.sortBySurname('desc');

      expect(service.filter()).toEqual({ name: 'a', department: 'eng', sort: 'desc' });
    });
  });
});
