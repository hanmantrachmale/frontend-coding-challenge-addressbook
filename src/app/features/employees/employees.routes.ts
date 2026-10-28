import { Routes } from '@angular/router';
import { EmployeePage } from './pages/employee-page/employee-page';

/** Routes for the employees feature, lazy-loaded under `/employees`. */
export const EMPLOYEE_ROUTES: Routes = [
  { path: '', component: EmployeePage, title: 'Employees' },
  { path: '**', redirectTo: '' },
];
