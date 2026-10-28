import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { EmployeeForm } from '../../components/employee-form/employee-form';
import { EmployeeList } from '../../components/employee-list/employee-list';
import { SearchPanel } from '../../components/search-panel/search-panel';
import {
  EmployeeValidationError,
  fullName,
  NewEmployee,
  SortDirection,
} from '../../data/employee.model';
import { EmployeeService } from '../../data/employee.service';

/**
 * The address book page: add form, search panel and employee list.
 * The only component that talks to {@link EmployeeService}; its children receive data through inputs and
 * report user actions through outputs.
 */
@Component({
  selector: 'app-employee-page',
  imports: [EmployeeForm, EmployeeList, SearchPanel],
  templateUrl: './employee-page.html',
  styleUrl: './employee-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePage {
  private readonly employeeService = inject(EmployeeService);
  private readonly employeeForm = viewChild.required(EmployeeForm);

  /** Employees matching the current searches, sorted by surname (computed in the service). */
  protected readonly employees = this.employeeService.filteredEmployees;
  protected readonly totalCount = this.employeeService.count;

  // Separate signals per criterion, so a change to one only updates the bindings that use it.
  protected readonly nameQuery = this.employeeService.nameQuery;
  protected readonly departmentQuery = this.employeeService.departmentQuery;
  protected readonly sortDirection = this.employeeService.sortDirection;

  /** Result of the last add, announced to screen readers. */
  protected readonly addStatus = signal('');

  /** Error from the last add attempt, shown as an alert. */
  protected readonly addError = signal('');

  protected onAdd(input: NewEmployee): void {
    this.addError.set('');
    try {
      const added = this.employeeService.addEmployee(input);
      const name = fullName(added);
      const isVisible = this.employees().some((employee) => employee.id === added.id);
      this.addStatus.set(
        isVisible ? `Added ${name}.` : `Added ${name}. They are hidden by the current search.`,
      );
      this.employeeForm().reset();
    } catch (error) {
      if (!(error instanceof EmployeeValidationError)) {
        throw error;
      }
      this.addStatus.set('');
      this.addError.set('The employee could not be added. Please check the details and try again.');
    }
  }

  protected onCancelAdd(): void {
    this.addStatus.set('');
    this.addError.set('');
    this.employeeForm().reset();
  }

  protected onNameChange(name: string): void {
    this.employeeService.searchByName(name);
  }

  protected onDepartmentChange(department: string): void {
    this.employeeService.searchByDepartment(department);
  }

  protected onSortChange(direction: SortDirection): void {
    this.employeeService.sortBySurname(direction);
  }

  protected onDelete(id: string): void {
    this.employeeService.deleteEmployee(id);
  }
}
