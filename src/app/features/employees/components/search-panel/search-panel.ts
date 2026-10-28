import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  model,
  viewChild,
} from '@angular/core';
import { EmployeeFilter } from '../../data/employee.model';

/** The search part of {@link EmployeeFilter}: what the user has typed, untrimmed. */
export type SearchCriteria = Pick<EmployeeFilter, 'name' | 'department'>;

/**
 * Search landmark with name and department search boxes.
 * Both values are two-way bindable signals, so the parent owns the state and the panel reflects it.
 */
@Component({
  selector: 'app-search-panel',
  templateUrl: './search-panel.html',
  styleUrl: './search-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPanel {
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  /** Name search text. Bind with `[(name)]` or `[name]` + `(nameChange)`. */
  readonly name = model('');

  /** Department search text. Bind with `[(department)]` or `[department]` + `(departmentChange)`. */
  readonly department = model('');

  /** Current search criteria as one read-only value. */
  readonly criteria = computed<SearchCriteria>(() => ({
    name: this.name(),
    department: this.department(),
  }));

  /** Whether any search is applied; whitespace-only text does not count. */
  readonly isActive = computed(() => this.name().trim() !== '' || this.department().trim() !== '');

  /** Stops Enter from submitting the form and reloading the page; results already update as the user types. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
  }

  /** Clears both searches and returns focus to the name box, since the clear button disappears. */
  protected clear(): void {
    this.name.set('');
    this.department.set('');
    this.nameInput().nativeElement.focus();
  }
}
