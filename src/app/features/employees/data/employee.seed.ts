import { createEmployee, Employee } from './employee.model';

/**
 * Initial in-memory employees, validated and frozen at startup.
 * Data resets to this list on every page reload.
 * Names include apostrophes, particles and accents to exercise search and sort.
 */
export const EMPLOYEE_SEED: readonly Employee[] = Object.freeze([
  createEmployee('seed-0001', {
    firstName: 'Priya',
    lastName: 'Sharma',
    department: 'Engineering',
    phoneNumber: '+61 2 9000 0001',
  }),
  createEmployee('seed-0002', {
    firstName: 'Liam',
    lastName: "O'Brien",
    department: 'Finance',
    phoneNumber: '+61 2 9000 0002',
  }),
  createEmployee('seed-0003', {
    firstName: 'Sanne',
    lastName: 'de Vries',
    department: 'Marketing',
    phoneNumber: '+61 2 9000 0003',
  }),
  createEmployee('seed-0004', {
    firstName: 'Erik',
    lastName: 'Åberg',
    department: 'Engineering',
    phoneNumber: '+61 2 9000 0004',
  }),
  createEmployee('seed-0005', {
    firstName: 'Maria',
    lastName: 'Garcia',
    department: 'Human Resources',
    phoneNumber: '+61 2 9000 0005',
  }),
]);
