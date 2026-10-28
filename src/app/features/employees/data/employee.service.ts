import { computed, Injectable, signal } from '@angular/core';
import {
  createEmployee,
  DEFAULT_EMPLOYEE_FILTER,
  Employee,
  EmployeeFilter,
  fullName,
  NewEmployee,
  SortDirection,
} from './employee.model';
import { EMPLOYEE_SEED } from './employee.seed';

/**
 * Compares names alphabetically, ignoring case and accents.
 * Fixed to English so ordering is the same on every machine.
 */
const nameCollator = new Intl.Collator('en', { sensitivity: 'base' });

/** An employee paired with its normalized search text. */
interface SearchEntry {
  readonly employee: Employee;
  readonly fullName: string;
  readonly department: string;
}

/**
 * In-memory source of truth for employees, plus the current search and sort criteria.
 * State is exposed read-only; every change replaces the previous array.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly employeesState = signal<readonly Employee[]>(EMPLOYEE_SEED);
  private readonly nameQueryState = signal(DEFAULT_EMPLOYEE_FILTER.name);
  private readonly departmentQueryState = signal(DEFAULT_EMPLOYEE_FILTER.department);
  private readonly sortDirectionState = signal<SortDirection>(DEFAULT_EMPLOYEE_FILTER.sort);

  /** All employees, in insertion order. */
  readonly employees = this.employeesState.asReadonly();

  /** Total number of employees, before filtering. */
  readonly count = computed(() => this.employees().length);

  /** Name search text, as entered. */
  readonly nameQuery = this.nameQueryState.asReadonly();

  /** Department search text, as entered. */
  readonly departmentQuery = this.departmentQueryState.asReadonly();

  /** Current last-name sort direction. */
  readonly sortDirection = this.sortDirectionState.asReadonly();

  /** Current search and sort criteria as one value. Bind to the individual signals above for finer updates. */
  readonly filter = computed<EmployeeFilter>(() => ({
    name: this.nameQuery(),
    department: this.departmentQuery(),
    sort: this.sortDirection(),
  }));

  /** Normalized search text per employee; rebuilt only when employees change, not on every keystroke. */
  private readonly searchIndex = computed<readonly SearchEntry[]>(() =>
    this.employees().map((employee) => ({
      employee,
      fullName: normalizeForSearch(fullName(employee)),
      department: normalizeForSearch(employee.department),
    })),
  );

  /** Employees matching both searches, unsorted; not recomputed when only the sort direction changes. */
  private readonly matchingEmployees = computed<readonly Employee[]>(() => {
    const name = normalizeForSearch(this.nameQuery());
    const department = normalizeForSearch(this.departmentQuery());
    return this.searchIndex()
      .filter((entry) => entry.fullName.includes(name) && entry.department.includes(department))
      .map((entry) => entry.employee);
  });

  /** Employees matching the current name and department searches, sorted by surname. */
  readonly filteredEmployees = computed<readonly Employee[]>(() =>
    sortByLastName(this.matchingEmployees(), this.sortDirection()),
  );

  /**
   * Validates and adds an employee with a newly generated id.
   * @returns The stored employee, with trimmed values.
   * @throws {EmployeeValidationError} when the data breaks a domain rule; state is left unchanged.
   */
  addEmployee(input: NewEmployee): Employee {
    const employee = createEmployee(crypto.randomUUID(), input);
    this.employeesState.update((employees) => [...employees, employee]);
    return employee;
  }

  /**
   * Removes the employee with the given id.
   * @returns `true` if an employee was removed, `false` if no employee had that id.
   */
  deleteEmployee(id: string): boolean {
    const employees = this.employeesState();
    const remaining = employees.filter((employee) => employee.id !== id);
    if (remaining.length === employees.length) {
      return false;
    }
    this.employeesState.set(remaining);
    return true;
  }

  /** Filters by first name, last name or full name. Case- and accent-insensitive; blank shows everyone. */
  searchByName(query: string): void {
    this.nameQueryState.set(query);
  }

  /** Filters by department ("contains" match). Case- and accent-insensitive; blank shows all departments. */
  searchByDepartment(department: string): void {
    this.departmentQueryState.set(department);
  }

  /** Sorts by last name, then first name, in the given direction. */
  sortBySurname(direction: SortDirection): void {
    this.sortDirectionState.set(direction);
  }
}

/** Lowercases, strips accents and collapses whitespace so `  ÅBERG ` matches `aberg`. An empty result matches everything. */
function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Returns a new array sorted by last name, then first name, then id, so the order is always deterministic. */
function sortByLastName(employees: readonly Employee[], direction: SortDirection): Employee[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...employees].sort(
    (a, b) =>
      sign *
      (nameCollator.compare(a.lastName, b.lastName) ||
        nameCollator.compare(a.firstName, b.firstName) ||
        compareIds(a.id, b.id)),
  );
}

function compareIds(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
