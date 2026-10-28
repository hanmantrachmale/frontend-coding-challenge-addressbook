import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  output,
  viewChildren,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import {
  EMPLOYEE_CONSTRAINTS,
  EMPLOYEE_MAX_LENGTHS,
  EmployeeValidationCode,
  NEW_EMPLOYEE_FIELDS,
  NewEmployee,
  NewEmployeeField,
  validateEmployeeField,
} from '../../data/employee.model';

/** How one form field is rendered. */
interface FieldConfig {
  readonly name: NewEmployeeField;
  readonly id: string;
  readonly label: string;
  readonly type: 'text' | 'tel';
  readonly hint?: string;
}

/**
 * Fields in display order. No autocomplete tokens: the form describes another person, so the browser must not
 * offer the user's own name or phone number (WCAG 1.3.5 tokens describe the user).
 */
const FIELDS: readonly FieldConfig[] = [
  { name: 'firstName', id: 'employee-first-name', label: 'First name', type: 'text' },
  { name: 'lastName', id: 'employee-last-name', label: 'Last name', type: 'text' },
  { name: 'department', id: 'employee-department', label: 'Department', type: 'text' },
  {
    name: 'phoneNumber',
    id: 'employee-phone-number',
    label: 'Phone number',
    type: 'tel',
    hint: `Digits, spaces, + ( ) and - only; ${EMPLOYEE_CONSTRAINTS.phoneNumberMinDigits} to ${EMPLOYEE_CONSTRAINTS.phoneNumberMaxDigits} digits.`,
  },
];

/** Angular validator that applies the domain rule for one field, so form and model can never disagree. */
function employeeFieldValidator(field: NewEmployeeField): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const code = validateEmployeeField(field, control.value);
    return code === null ? null : { [code]: true };
  };
}

function errorMessageFor(field: FieldConfig, code: EmployeeValidationCode): string {
  switch (code) {
    case 'required':
      return `${field.label} is required.`;
    case 'maxLength':
      return `${field.label} must be ${EMPLOYEE_MAX_LENGTHS[field.name]} characters or fewer.`;
    case 'pattern':
      return `Enter a valid ${field.label.toLowerCase()}.`;
  }
}

/**
 * Typed reactive form for entering a new employee.
 * Values are trimmed on blur and on submit; errors appear once a field is touched or a submit is attempted.
 */
@Component({
  selector: 'app-employee-form',
  imports: [ReactiveFormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeForm {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('fieldInput');

  protected readonly fields = FIELDS;

  /** Form model; one control per {@link NewEmployee} field, each validated by the domain rules. */
  protected readonly form = this.formBuilder.group({
    firstName: ['', employeeFieldValidator('firstName')],
    lastName: ['', employeeFieldValidator('lastName')],
    department: ['', employeeFieldValidator('department')],
    phoneNumber: ['', employeeFieldValidator('phoneNumber')],
  });

  /** Emits the trimmed employee when a valid form is submitted. */
  readonly submitted = output<NewEmployee>();

  /** Emits when the user cancels without saving. */
  readonly cancelled = output<void>();

  /** Error text for a field, or `null` while it is valid or untouched. */
  protected errorMessage(field: FieldConfig): string | null {
    const control = this.form.controls[field.name];
    if (!control.touched) {
      return null;
    }
    const code = validateEmployeeField(field.name, control.value);
    return code === null ? null : errorMessageFor(field, code);
  }

  /** Ids of the hint and error text describing a field, for `aria-describedby`. */
  protected describedBy(field: FieldConfig): string | null {
    const ids = [
      field.hint ? `${field.id}-hint` : null,
      this.errorMessage(field) ? `${field.id}-error` : null,
    ].filter((id): id is string => id !== null);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  /** Removes leading and trailing whitespace from a field's value. */
  protected trim(field: NewEmployeeField): void {
    const control = this.form.controls[field];
    const trimmed = control.value.trim();
    if (trimmed !== control.value) {
      control.setValue(trimmed);
    }
  }

  protected onSubmit(): void {
    NEW_EMPLOYEE_FIELDS.forEach((field) => this.trim(field));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  /** Empties every field, clears errors and focuses the first field, ready for the next entry. */
  reset(): void {
    // Focus first: moving focus blurs the previously focused field, which would mark it touched again
    // and show a "required" error on the freshly reset form.
    this.inputs()[0]?.nativeElement.focus();
    this.form.reset();
    // Touched state is not a signal, so an OnPush view must be told to re-render when reset from outside.
    this.changeDetector.markForCheck();
  }

  private focusFirstInvalidField(): void {
    const index = this.fields.findIndex((field) => this.form.controls[field.name].invalid);
    this.inputs()[index]?.nativeElement.focus();
  }
}
