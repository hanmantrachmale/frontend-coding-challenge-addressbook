import {
  createEmployee,
  EMPLOYEE_CONSTRAINTS,
  EmployeeValidationError,
  NewEmployee,
  validateEmployeeField,
  validateNewEmployee,
} from './employee.model';
import { EMPLOYEE_SEED } from './employee.seed';

function buildNewEmployee(overrides: Partial<NewEmployee> = {}): NewEmployee {
  return {
    firstName: 'Priya',
    lastName: 'Sharma',
    department: 'Engineering',
    phoneNumber: '+61 2 9000 0001',
    ...overrides,
  };
}

describe('validateNewEmployee', () => {
  it('returns no issues for valid data', () => {
    expect(validateNewEmployee(buildNewEmployee())).toEqual([]);
  });

  it.each(['firstName', 'lastName', 'department', 'phoneNumber'] as const)(
    'requires %s',
    (field) => {
      expect(validateNewEmployee(buildNewEmployee({ [field]: '' }))).toEqual([
        { field, code: 'required' },
      ]);
    },
  );

  it.each(['firstName', 'lastName', 'department', 'phoneNumber'] as const)(
    'treats whitespace-only %s as missing',
    (field) => {
      expect(validateNewEmployee(buildNewEmployee({ [field]: '   ' }))).toEqual([
        { field, code: 'required' },
      ]);
    },
  );

  it('reports every invalid field at once', () => {
    const issues = validateNewEmployee({
      firstName: '',
      lastName: '',
      department: '',
      phoneNumber: '',
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      'firstName',
      'lastName',
      'department',
      'phoneNumber',
    ]);
  });

  describe('length limits', () => {
    it.each([
      ['firstName', EMPLOYEE_CONSTRAINTS.nameMaxLength],
      ['lastName', EMPLOYEE_CONSTRAINTS.nameMaxLength],
      ['department', EMPLOYEE_CONSTRAINTS.departmentMaxLength],
    ] as const)('accepts %s at exactly %i characters', (field, max) => {
      expect(validateNewEmployee(buildNewEmployee({ [field]: 'a'.repeat(max) }))).toEqual([]);
    });

    it.each([
      ['firstName', EMPLOYEE_CONSTRAINTS.nameMaxLength],
      ['lastName', EMPLOYEE_CONSTRAINTS.nameMaxLength],
      ['department', EMPLOYEE_CONSTRAINTS.departmentMaxLength],
    ] as const)('rejects %s longer than %i characters', (field, max) => {
      expect(validateNewEmployee(buildNewEmployee({ [field]: 'a'.repeat(max + 1) }))).toEqual([
        { field, code: 'maxLength' },
      ]);
    });

    it('measures length after trimming', () => {
      const padded = `  ${'a'.repeat(EMPLOYEE_CONSTRAINTS.nameMaxLength)}  `;

      expect(validateNewEmployee(buildNewEmployee({ firstName: padded }))).toEqual([]);
    });
  });

  it.each(["O'Brien", 'de Vries', 'Åberg', 'Smith-Jones', '李'])(
    'accepts the name %s',
    (lastName) => {
      expect(validateNewEmployee(buildNewEmployee({ lastName }))).toEqual([]);
    },
  );

  describe('phone number', () => {
    it.each(['0290000001', '+61 2 9000 0001', '(02) 9000-0001', '123456', '+123456789012345'])(
      'accepts %s',
      (phoneNumber) => {
        expect(validateNewEmployee(buildNewEmployee({ phoneNumber }))).toEqual([]);
      },
    );

    it.each([
      ['letters', '02 9000 ABCD'],
      ['a plus sign that is not leading', '61+290000001'],
      ['fewer than 6 digits', '12345'],
      ['more than 15 digits', '1234567890123456'],
      ['only punctuation', '() - ()'],
      ['an extension marker', '9000 0001 x12'],
    ])('rejects %s', (_case, phoneNumber) => {
      expect(validateNewEmployee(buildNewEmployee({ phoneNumber }))).toEqual([
        { field: 'phoneNumber', code: 'pattern' },
      ]);
    });

    it('rejects a phone number longer than the maximum length', () => {
      const phoneNumber = '1 2 3 4 5 6 7 8 9 0 1';

      expect(phoneNumber.length).toBeGreaterThan(EMPLOYEE_CONSTRAINTS.phoneNumberMaxLength);
      expect(validateNewEmployee(buildNewEmployee({ phoneNumber }))).toEqual([
        { field: 'phoneNumber', code: 'maxLength' },
      ]);
    });
  });
});

describe('validateEmployeeField', () => {
  it('returns null for a valid value', () => {
    expect(validateEmployeeField('firstName', 'Priya')).toBeNull();
  });

  it('checks the trimmed value', () => {
    expect(validateEmployeeField('lastName', '   ')).toBe('required');
    expect(
      validateEmployeeField('lastName', `  ${'a'.repeat(EMPLOYEE_CONSTRAINTS.nameMaxLength)}  `),
    ).toBeNull();
  });

  it('reports a length problem before a format problem', () => {
    expect(
      validateEmployeeField(
        'phoneNumber',
        'x'.repeat(EMPLOYEE_CONSTRAINTS.phoneNumberMaxLength + 1),
      ),
    ).toBe('maxLength');
  });

  it('applies the phone format only to the phone number', () => {
    expect(validateEmployeeField('phoneNumber', 'abc')).toBe('pattern');
    expect(validateEmployeeField('department', 'abc')).toBeNull();
  });
});

describe('createEmployee', () => {
  it('returns an employee with the given id and data', () => {
    expect(createEmployee('emp-1', buildNewEmployee())).toEqual({
      id: 'emp-1',
      firstName: 'Priya',
      lastName: 'Sharma',
      department: 'Engineering',
      phoneNumber: '+61 2 9000 0001',
    });
  });

  it('trims every field', () => {
    const employee = createEmployee(
      'emp-1',
      buildNewEmployee({
        firstName: '  Priya ',
        lastName: ' Sharma  ',
        department: '\tEngineering\n',
        phoneNumber: ' 0290000001 ',
      }),
    );

    expect(employee).toEqual({
      id: 'emp-1',
      firstName: 'Priya',
      lastName: 'Sharma',
      department: 'Engineering',
      phoneNumber: '0290000001',
    });
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(createEmployee('emp-1', buildNewEmployee()))).toBe(true);
  });

  it('does not mutate the input', () => {
    const input = buildNewEmployee({ firstName: '  Priya  ' });

    createEmployee('emp-1', input);

    expect(input.firstName).toBe('  Priya  ');
  });

  it('throws an EmployeeValidationError listing the invalid fields', () => {
    const create = (): unknown =>
      createEmployee('emp-1', buildNewEmployee({ firstName: '', phoneNumber: 'abc' }));

    expect(create).toThrow(EmployeeValidationError);
    try {
      create();
    } catch (error) {
      expect((error as EmployeeValidationError).issues).toEqual([
        { field: 'firstName', code: 'required' },
        { field: 'phoneNumber', code: 'pattern' },
      ]);
    }
  });

  it.each(['', '   '])('rejects a blank id (%j)', (id) => {
    expect(() => createEmployee(id, buildNewEmployee())).toThrow(
      new EmployeeValidationError([{ field: 'id', code: 'required' }]),
    );
  });

  it('keeps entered values out of the error message', () => {
    const create = (): unknown =>
      createEmployee(
        'emp-1',
        buildNewEmployee({ lastName: 'x'.repeat(51), phoneNumber: 'secret-ABC' }),
      );

    expect(create).toThrow('Invalid employee: lastName (maxLength), phoneNumber (pattern)');
  });
});

describe('EmployeeValidationError', () => {
  it('is an Error with a descriptive name', () => {
    const error = new EmployeeValidationError([{ field: 'lastName', code: 'required' }]);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EmployeeValidationError');
    expect(error.message).toBe('Invalid employee: lastName (required)');
  });
});

describe('EMPLOYEE_SEED', () => {
  it.each(EMPLOYEE_SEED.map((employee) => [employee.id, employee] as const))(
    'seed employee %s satisfies the domain rules',
    (id, employee) => {
      const { id: _id, ...data } = employee;

      expect(createEmployee(id, data)).toEqual(employee);
    },
  );
});
