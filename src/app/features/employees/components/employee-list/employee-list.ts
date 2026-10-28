import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Employee, fullName, SortDirection } from '../../data/employee.model';

/**
 * Accessible table of employees.
 * The "Last name" header toggles the sort; Delete asks for confirmation inline before emitting.
 */
@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList {
  private readonly injector = inject(Injector);
  private readonly summary = viewChild.required<ElementRef<HTMLElement>>('summary');
  private readonly deleteButtons = viewChildren<ElementRef<HTMLButtonElement>>('deleteButton');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');

  /** Employees to display, already filtered and sorted. */
  readonly employees = input.required<readonly Employee[]>();

  /** Total employees before filtering, used in the result summary and empty message. */
  readonly totalCount = input.required<number>();

  /** Current sort direction for last name, shown on the column header. */
  readonly sort = input<SortDirection>('asc');

  /** Emits the id of an employee the user has confirmed for deletion. */
  readonly delete = output<string>();

  /** Emits the requested sort direction when the "Last name" header is activated. */
  readonly sortChange = output<SortDirection>();

  /**
   * Id of the employee whose row is showing the delete confirmation, if any.
   * Dropped automatically when that employee leaves the list (e.g. hidden by a search), so a stale
   * confirmation never reappears later.
   */
  protected readonly pendingDeleteId = linkedSignal<readonly Employee[], string | null>({
    source: this.employees,
    computation: (employees, previous) =>
      previous?.value != null && employees.some((employee) => employee.id === previous.value)
        ? previous.value
        : null,
  });

  /** Announced to screen readers after an action, e.g. "Deleted Priya Sharma." */
  protected readonly statusMessage = signal('');

  protected readonly ariaSort = computed(() =>
    this.sort() === 'asc' ? 'ascending' : 'descending',
  );

  protected readonly fullName = fullName;

  protected toggleSort(): void {
    this.sortChange.emit(this.sort() === 'asc' ? 'desc' : 'asc');
  }

  /** Shows the inline confirmation for an employee and moves focus to its Confirm button. */
  protected requestDelete(employee: Employee): void {
    this.pendingDeleteId.set(employee.id);
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Hides the confirmation and returns focus to the row's Delete button. */
  protected cancelDelete(employee: Employee): void {
    this.pendingDeleteId.set(null);
    this.focusDeleteButtonAfterRender(employee.id);
  }

  /**
   * Emits the deletion and announces it. The row is about to disappear, so focus moves to the Delete button
   * of the next row (or the previous one when deleting the last row), or to the result summary if the list
   * becomes empty.
   */
  protected confirmDelete(employee: Employee): void {
    const employees = this.employees();
    const index = employees.findIndex((candidate) => candidate.id === employee.id);
    const neighbour = employees[index + 1] ?? employees[index - 1];

    this.pendingDeleteId.set(null);
    this.announce(`Deleted ${fullName(employee)}.`);
    this.delete.emit(employee.id);
    this.focusDeleteButtonAfterRender(neighbour?.id);
  }

  /** Sets the status text, clearing it first so a repeated message (same name twice) is still announced. */
  private announce(message: string): void {
    this.statusMessage.set('');
    afterNextRender(() => this.statusMessage.set(message), { injector: this.injector });
  }

  /** After the next render, focuses the Delete button for `id`, falling back to the result summary. */
  private focusDeleteButtonAfterRender(id: string | undefined): void {
    afterNextRender(
      () => {
        const button = this.deleteButtons().find(
          (ref) => ref.nativeElement.dataset['employeeId'] === id,
        );
        (button ?? this.summary()).nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
