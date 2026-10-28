import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewEmployee } from '../../data/employee.model';
import { EmployeeForm } from './employee-form';

const FIELD_IDS = {
  firstName: 'employee-first-name',
  lastName: 'employee-last-name',
  department: 'employee-department',
  phoneNumber: 'employee-phone-number',
} as const;

type Field = keyof typeof FIELD_IDS;

const VALID_EMPLOYEE: NewEmployee = {
  firstName: 'Priya',
  lastName: 'Sharma',
  department: 'Engineering',
  phoneNumber: '+61 2 9000 0001',
};

describe('EmployeeForm', () => {
  let fixture: ComponentFixture<EmployeeForm>;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmployeeForm);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function input(field: Field): HTMLInputElement {
    const found = element.querySelector<HTMLInputElement>(`#${FIELD_IDS[field]}`);
    if (!found) {
      throw new Error(`Input for ${field} not found`);
    }
    return found;
  }

  function errorText(field: Field): string | null {
    return element.querySelector(`#${FIELD_IDS[field]}-error`)?.textContent?.trim() ?? null;
  }

  async function type(field: Field, value: string): Promise<void> {
    const control = input(field);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function blur(field: Field): Promise<void> {
    input(field).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fill(values: NewEmployee): Promise<void> {
    for (const field of Object.keys(FIELD_IDS) as Field[]) {
      await type(field, values[field]);
    }
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();
  }

  function captureSubmitted(): NewEmployee[] {
    const emitted: NewEmployee[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    return emitted;
  }

  describe('accessibility', () => {
    it.each([
      ['firstName', 'First name'],
      ['lastName', 'Last name'],
      ['department', 'Department'],
      ['phoneNumber', 'Phone number'],
    ] as const)('labels the %s input as "%s"', (field, label) => {
      const labelElement = element.querySelector(`label[for="${FIELD_IDS[field]}"]`);

      expect(labelElement?.textContent?.trim()).toBe(label);
    });

    it.each(Object.keys(FIELD_IDS) as Field[])(
      'marks %s as required for assistive technology',
      (field) => {
        expect(input(field).getAttribute('aria-required')).toBe('true');
      },
    );

    it('uses a telephone input with a format hint for the phone number', () => {
      const phone = input('phoneNumber');

      expect(phone.type).toBe('tel');
      expect(phone.getAttribute('aria-describedby')).toBe('employee-phone-number-hint');
      expect(element.querySelector('#employee-phone-number-hint')?.textContent).toContain(
        '6 to 15 digits',
      );
    });

    it.each(Object.keys(FIELD_IDS) as Field[])(
      'turns off autocomplete for %s, since the form describes someone else',
      (field) => {
        expect(input(field).getAttribute('autocomplete')).toBe('off');
      },
    );

    it('links an error to its input and marks the input invalid', async () => {
      await blur('firstName');

      expect(input('firstName').getAttribute('aria-invalid')).toBe('true');
      expect(input('firstName').getAttribute('aria-describedby')).toBe('employee-first-name-error');
    });

    it('lists both hint and error in aria-describedby for the phone number', async () => {
      await type('phoneNumber', 'abc');
      await blur('phoneNumber');

      expect(input('phoneNumber').getAttribute('aria-describedby')).toBe(
        'employee-phone-number-hint employee-phone-number-error',
      );
    });
  });

  describe('initial state', () => {
    it('starts with empty fields', () => {
      for (const field of Object.keys(FIELD_IDS) as Field[]) {
        expect(input(field).value).toBe('');
      }
    });

    it('shows no errors before the user interacts', () => {
      expect(element.querySelectorAll('.error')).toHaveLength(0);
      expect(input('firstName').hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('required validation', () => {
    it.each([
      ['firstName', 'First name is required.'],
      ['lastName', 'Last name is required.'],
      ['department', 'Department is required.'],
      ['phoneNumber', 'Phone number is required.'],
    ] as const)('shows an error when %s is left empty', async (field, message) => {
      await blur(field);

      expect(errorText(field)).toBe(message);
    });

    it('treats whitespace-only input as empty', async () => {
      await type('lastName', '    ');
      await blur('lastName');

      expect(errorText('lastName')).toBe('Last name is required.');
    });

    it('clears the error once a value is entered', async () => {
      await blur('department');
      await type('department', 'Finance');

      expect(errorText('department')).toBeNull();
      expect(input('department').hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('trimming', () => {
    it('trims a field when it loses focus', async () => {
      await type('firstName', '  Priya  ');
      await blur('firstName');

      expect(input('firstName').value).toBe('Priya');
    });

    it('leaves inner spaces in place', async () => {
      await type('department', ' Human Resources ');
      await blur('department');

      expect(input('department').value).toBe('Human Resources');
    });
  });

  describe('length validation', () => {
    it('rejects a first name longer than 50 characters', async () => {
      await type('firstName', 'a'.repeat(51));
      await blur('firstName');

      expect(errorText('firstName')).toBe('First name must be 50 characters or fewer.');
    });

    it('accepts a first name of exactly 50 characters', async () => {
      await type('firstName', 'a'.repeat(50));
      await blur('firstName');

      expect(errorText('firstName')).toBeNull();
    });

    it('rejects a department longer than 100 characters', async () => {
      await type('department', 'a'.repeat(101));
      await blur('department');

      expect(errorText('department')).toBe('Department must be 100 characters or fewer.');
    });
  });

  describe('phone number format', () => {
    it.each(['+61 2 9000 0001', '(02) 9000-0001', '0290000001'])(
      'accepts %s',
      async (phoneNumber) => {
        await type('phoneNumber', phoneNumber);
        await blur('phoneNumber');

        expect(errorText('phoneNumber')).toBeNull();
      },
    );

    it.each(['02 9000 ABCD', '12345', '61+290000001', '() - ()'])(
      'rejects %s',
      async (phoneNumber) => {
        await type('phoneNumber', phoneNumber);
        await blur('phoneNumber');

        expect(errorText('phoneNumber')).toBe('Enter a valid phone number.');
      },
    );

    it('reports a phone number over 20 characters as too long', async () => {
      await type('phoneNumber', '1 2 3 4 5 6 7 8 9 0 1');
      await blur('phoneNumber');

      expect(errorText('phoneNumber')).toBe('Phone number must be 20 characters or fewer.');
    });
  });

  describe('submitting', () => {
    it('emits the entered employee when the form is valid', async () => {
      const emitted = captureSubmitted();
      await fill(VALID_EMPLOYEE);

      await submit();

      expect(emitted).toEqual([VALID_EMPLOYEE]);
    });

    it('emits trimmed values even if a field was never blurred', async () => {
      const emitted = captureSubmitted();
      await fill({
        firstName: '  Priya ',
        lastName: ' Sharma',
        department: 'Engineering  ',
        phoneNumber: ' +61 2 9000 0001 ',
      });

      await submit();

      expect(emitted).toEqual([VALID_EMPLOYEE]);
    });

    it('does not emit and shows every error when the form is empty', async () => {
      const emitted = captureSubmitted();

      await submit();

      expect(emitted).toEqual([]);
      expect(element.querySelectorAll('.error')).toHaveLength(4);
    });

    it('moves focus to the first invalid field', async () => {
      await fill({ ...VALID_EMPLOYEE, lastName: '', phoneNumber: 'abc' });

      await submit();

      expect(document.activeElement).toBe(input('lastName'));
    });

    it('does not emit when only the phone number is invalid', async () => {
      const emitted = captureSubmitted();
      await fill({ ...VALID_EMPLOYEE, phoneNumber: '123' });

      await submit();

      expect(emitted).toEqual([]);
      expect(errorText('phoneNumber')).toBe('Enter a valid phone number.');
      expect(document.activeElement).toBe(input('phoneNumber'));
    });

    it('keeps the submit button enabled so users can discover what is missing', () => {
      expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
        false,
      );
    });
  });

  describe('boundaries', () => {
    it.each([
      ['lastName', 'a'.repeat(50), null],
      ['lastName', 'a'.repeat(51), 'Last name must be 50 characters or fewer.'],
      ['department', 'a'.repeat(100), null],
      ['phoneNumber', '123456', null],
      ['phoneNumber', '123456789012345', null],
      ['phoneNumber', '1234567890123456', 'Enter a valid phone number.'],
      ['phoneNumber', '+61 2 9000 0001 0001', null],
    ] as const)('%s = %j → %j', async (field, value, expected) => {
      await type(field, value);
      await blur(field);

      expect(errorText(field)).toBe(expected);
    });

    it('measures length after trimming', async () => {
      await type('firstName', `   ${'a'.repeat(50)}   `);
      await blur('firstName');

      expect(errorText('firstName')).toBeNull();
      expect(input('firstName').value).toHaveLength(50);
    });
  });

  describe('edge cases', () => {
    it('does not show an error while the user is still typing in an untouched field', async () => {
      await type('phoneNumber', 'abc');

      expect(errorText('phoneNumber')).toBeNull();
    });

    it('accepts names with apostrophes, accents and non-Latin script unchanged', async () => {
      const emitted = captureSubmitted();
      const employee: NewEmployee = { ...VALID_EMPLOYEE, firstName: 'Zoë', lastName: "N'Diaye-李" };
      await fill(employee);

      await submit();

      expect(emitted).toEqual([employee]);
    });

    it('emits exactly the four employee fields', async () => {
      const emitted = captureSubmitted();
      await fill(VALID_EMPLOYEE);

      await submit();

      expect(Object.keys(emitted[0]).sort()).toEqual([
        'department',
        'firstName',
        'lastName',
        'phoneNumber',
      ]);
    });

    it('emits once the user fixes the errors from a failed submit', async () => {
      const emitted = captureSubmitted();
      await submit();

      await fill(VALID_EMPLOYEE);
      await submit();

      expect(emitted).toEqual([VALID_EMPLOYEE]);
      expect(element.querySelectorAll('.error')).toHaveLength(0);
    });

    it('treats tabs and newlines as whitespace when checking required', async () => {
      await type('department', '\t \t');
      await blur('department');

      expect(errorText('department')).toBe('Department is required.');
    });
  });

  describe('reset', () => {
    it('empties every field, clears errors and focuses the first field', async () => {
      await fill({ ...VALID_EMPLOYEE, phoneNumber: 'abc' });
      await submit();
      expect(element.querySelectorAll('.error').length).toBeGreaterThan(0);

      fixture.componentInstance.reset();
      await fixture.whenStable();

      for (const field of Object.keys(FIELD_IDS) as Field[]) {
        expect(input(field).value).toBe('');
        expect(input(field).hasAttribute('aria-invalid')).toBe(false);
      }
      expect(element.querySelectorAll('.error')).toHaveLength(0);
      expect(document.activeElement).toBe(input('firstName'));
    });

    it('empties the field values and focuses the first field', async () => {
      await fill(VALID_EMPLOYEE);

      fixture.componentInstance.reset();
      await fixture.whenStable();

      for (const field of Object.keys(FIELD_IDS) as Field[]) {
        expect(input(field).value).toBe('');
      }
      expect(document.activeElement).toBe(input('firstName'));
    });
  });

  describe('cancelling', () => {
    it('emits cancelled without submitting', async () => {
      const emitted = captureSubmitted();
      let cancelled = 0;
      fixture.componentInstance.cancelled.subscribe(() => cancelled++);

      element.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
      await fixture.whenStable();

      expect(cancelled).toBe(1);
      expect(emitted).toEqual([]);
    });
  });
});
