# Address Book — Architecture

Status: Implemented · Last reviewed: 2026-10-28 (see `architecture-review.md`) · Author: Architect agent

## 0. Context and scope

An employee address book with five required features:

| # | Feature | Notes |
|---|---------|-------|
| F1 | Add employee | Validated form |
| F2 | Delete employee | With confirmation |
| F3 | Search by name | First name, surname or full name; case-insensitive |
| F4 | Search by department | Free-text department, case-insensitive match |
| F5 | Sort by surname | A→Z / Z→A, locale-aware, stable |

Constraints: Angular 22 (installed), standalone components, signals for state, in-memory storage (data resets on reload), Vitest for tests.

Out of scope for now: edit employee, persistence (localStorage/HTTP), authentication, pagination. The design leaves a clear seam for each (see §6).

Guiding rule: **the simplest design that is correct, testable and readable.** One feature, one signal service, no state library.

---

## 1. Folder structure

```
src/app/
  app.ts / app.html / app.scss      Shell: header, <main>, <router-outlet>
  app.config.ts                     Providers (router)
  app.routes.ts                     '' → redirect 'employees'; lazy-load feature
  features/
    employees/
      employees.routes.ts           Feature routes ('' → EmployeePage)
      data/
        employee.model.ts           Employee, NewEmployee, SortDirection, EmployeeFilter, domain rules, fullName()
        employee.service.ts         EmployeeService (employee + filter signals, add/delete/search/sort)
        employee.seed.ts            Initial in-memory data (validated with createEmployee, frozen)
      pages/
        employee-page/              Routed container: add form + search + list; the only service consumer
      components/
        search-panel/               Presentational: name + department search (model() signals)
        employee-list/              Presentational: renders rows, sortable surname header, emits delete/sort
        employee-form/              Presentational: typed form, emits submitted NewEmployee
```

Rules:

- Each component folder holds `name.ts`, `name.html`, `name.scss`, `name.spec.ts` (Angular 20+ naming, no `.component` suffix — matches the existing `app.ts`).
- `pages/` may inject services; `components/` may not — they use only `input()` / `output()` / `model()`. The one exception is `EmployeeForm.reset()`, a public method the page calls after a successful add.
- No `core/` or `shared/` folders yet. Create them only when a second feature needs something shared. Creating them now would be empty structure.
- No barrel (`index.ts`) files.

---

## 2. Domain model

```
Employee {
  readonly id:          string       // crypto.randomUUID(), assigned by EmployeeService
  readonly firstName:  string        // required, trimmed, 1–50 chars
  readonly lastName:    string       // required, trimmed, 1–50 chars ("surname" in the UI/features)
  readonly department:  string       // required, free text, trimmed, 1–100 chars
  readonly phoneNumber: string       // required, ≤ 20 chars, optional leading +, digits/spaces/()-, 6–15 digits
}

NewEmployee   = Omit<Employee, 'id'>   // what the form produces and the service accepts
SortDirection = 'asc' | 'desc'

EmployeeFilter {
  name:       string                  // '' = no filter
  department: string                  // '' = all departments
  sort:       SortDirection
}
```

Decisions:

- **Immutable records** (`readonly`, `ReadonlyArray`). Updates create new arrays so signals detect changes and callers can't mutate service state.
- **Department is free text** (per `project-assumptions.md`). Search is a trimmed, case-insensitive "contains" match, so `eng` finds `Engineering`.
- **ID created by the service**, not the form, so every record has exactly one ID source. Tests stub `crypto.randomUUID`.
- **Domain rules live in `employee.model.ts`:** `validateNewEmployee()` returns `EmployeeValidationIssue[]` (field + code, never values, so safe to log); `createEmployee(id, input)` trims, validates, freezes, and throws `EmployeeValidationError`. Limits are in `EMPLOYEE_CONSTRAINTS`, which the form validators reuse — one source for every rule.
- **No postal address** for now; add an optional `address` value object later if needed.

### Search and sort rules (private helpers in `employee.service.ts`)

| Rule | Behaviour |
|------|-----------|
| Name match | Lowercase, strip accents (`normalize('NFD')`), collapse whitespace and trim; empty → match all. Matches if `firstName + ' ' + lastName` contains the query, which covers first name, last name and full name. Plain `includes`, no regex, so `.*(` is safe. |
| Department match | Same normalization; empty → match all; otherwise "contains" on `department`. |
| Sort by surname | Returns a **new** array. `Intl.Collator('en', { sensitivity: 'base' })` on `lastName`, then first name, then id for full determinism. Locale is fixed so order is identical on every machine. `desc` negates the comparator. |
| Filtered list | Three chained `computed` signals: `searchIndex` (normalized text per employee, rebuilt only when employees change) → `matchingEmployees` (name ∧ department, not re-run on sort change) → `filteredEmployees` (sorted). |

The helpers stay private to the service and are tested through its public API.

---

## 3. Component hierarchy

```
App (shell: header, nav link "Add employee" → /employees#add-employee, <main>)
└── <router-outlet>
    └── /employees            EmployeePage                [container — only service consumer]
        ├── section "Add employee"
        │   └── EmployeeForm   out: submitted(NewEmployee), cancelled; method: reset()  [presentational]
        └── section "Employee directory"
            ├── SearchPanel    model: name, department (two-way)    [presentational]
            └── EmployeeList   in: employees, totalCount, sort → out: delete(id), sortChange  [presentational]
```

| Component | Responsibility | Talks to |
|-----------|----------------|----------|
| `App` | Layout and skip link. The skip link focuses `<main>` in a click handler: with `<base href="/">` a plain `#main-content` href would reload the app and lose in-memory data | Router |
| `EmployeePage` | Single page with two labelled sections (Add employee, Employee directory). Binds children to the service's per-criterion read-only signals; forwards add, search, sort and delete to the service; announces adds (`role="status"`) and shows add failures (`role="alert"`); resets the form after a successful add | `EmployeeService` |
| `SearchPanel` | `role="search"` landmark with labelled name and department search boxes and hints. `name`/`department` are `model()` signals; exposes read-only `criteria` and `isActive`. Enter does not reload; "Clear search" resets both and returns focus to the name box | Parent only |
| `EmployeeList` | Accessible `<table>` with caption and `<th scope>`, in a labelled, focusable scroll region; "N of M employees" polite live region; "Last name" header as a sort button with `aria-sort`; per-row Delete with inline confirm (Delete → Confirm / Cancel, Escape cancels) | Parent only |
| `EmployeeForm` | Typed reactive form; `autocomplete="off"` because it describes another person; trims on blur and submit; errors shown once touched, linked by `aria-describedby` with `aria-invalid`; submit stays enabled and an invalid submit focuses the first invalid field | Parent only |

All components: standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, `input()` / `output()` / `model()`, signal queries (`viewChild`, `viewChildren`), `@if` / `@for (… ; track employee.id)`, `@let`.

Delete confirmation is inline in the row rather than a modal dialog: no dialog service, no focus-trap code, and it stays keyboard-accessible (focus moves to Confirm; after Cancel it returns to the row's Delete button; after delete it moves to the next row's Delete button, the previous row's if the last row was deleted, or the result summary if the list is empty). The deletion is announced through a `role="status"` region that is cleared first, so repeated messages are re-announced.

### Routing

```
app.routes.ts
  ''          → redirectTo 'employees'
  'employees' → loadChildren: employees.routes.ts

employees.routes.ts
  ''     → EmployeePage        title: 'Employees'
  '**'   → redirect ''
```

Route `title` sets the document title for screen readers. Feature is lazy-loaded.

---

## 4. Service design

### `EmployeeService` — the only service

```
@Injectable({ providedIn: 'root' })
EmployeeService
  private employeesState       = signal<readonly Employee[]>(EMPLOYEE_SEED)
  private nameQueryState       = signal('')
  private departmentQueryState = signal('')
  private sortDirectionState   = signal<SortDirection>('asc')

  readonly employees         : Signal<readonly Employee[]>   // all, insertion order
  readonly count             : Signal<number>                // computed
  readonly nameQuery         : Signal<string>                // read-only
  readonly departmentQuery   : Signal<string>                // read-only
  readonly sortDirection     : Signal<SortDirection>         // read-only
  readonly filter            : Signal<EmployeeFilter>        // computed: the three criteria as one value
  readonly filteredEmployees : Signal<readonly Employee[]>   // computed: search + sort applied

  addEmployee(input: NewEmployee): Employee        // validates via createEmployee, appends; throws EmployeeValidationError
  deleteEmployee(id: string): boolean              // true if removed, false if id not found (state untouched)
  searchByName(query: string): void                // sets nameQuery
  searchByDepartment(department: string): void     // sets departmentQuery
  sortBySurname(direction: SortDirection): void    // sets sortDirection
```

Design points:

- **One service for employees and how they are viewed.** Search and sort are signal state, so `filteredEmployees` is a single `computed` that every view reads, and the name and department searches combine automatically.
- **Immutable updates only:** `update()`/`set()` with new arrays; a no-op delete keeps the same array reference, and setting a criterion to its current value notifies nothing, so nothing re-renders.
- **In-memory storage is the service itself.** No separate repository or `InjectionToken` — with one storage implementation, an abstraction would be over-engineering. When persistence is added, the service gains a load/save step or a `StorageAdapter` is introduced then (see §6).
- **Validation rules live in the domain model** (`EMPLOYEE_CONSTRAINTS`, `validateNewEmployee`). The form uses them to show errors; the service calls `createEmployee`, so invalid data can never enter state. One rule set, two enforcement points.
- **Synchronous API.** In-memory data needs no Observables or Promises. If HTTP is added, `resource()`/`httpResource()` slots in behind the same `employees` signal.
- **`providedIn: 'root'`** so state outlives the page component (but not a page reload).

### Validators

Each form control has one validator, `employeeFieldValidator(field)`, which calls the domain's `validateEmployeeField(field, value)`. Required (whitespace-only counts as empty), max length and phone format therefore have exactly one definition, and the form and the model can't disagree. Built-in `Validators.required` is not used because it accepts whitespace-only input.

---

## 5. State management strategy

| State | Kind | Owner | Mechanism |
|-------|------|-------|-----------|
| Employee collection | App/domain | `EmployeeService` | `signal`, exposed read-only |
| Count | Derived | `EmployeeService` | `computed` |
| Filter (name, department, sort) | View | `EmployeeService` | Three primitive `signal`s, exposed read-only; `filter` is a `computed` combining them |
| Visible employees | Derived | `EmployeeService` | `computed` chain: search index → matches → sorted |
| Pending delete id (inline confirm) | Local UI | `EmployeeList` | `linkedSignal` over `employees`, reset automatically when that employee leaves the list |
| Status messages | Local UI | `EmployeePage` (add), `EmployeeList` (delete) | `signal<string>` bound to `role="status"` |
| Form values / validity | Local UI | `EmployeeForm` | Typed reactive form (`FormBuilder.nonNullable`) |

Data flow (one direction):

```
EmployeeService.employees ──┐
                            ├─► computed filteredEmployees ─► EmployeeList (input)
EmployeeService.nameQuery / departmentQuery / sortDirection ─┘
      ▲                                                        │
SearchPanel (nameChange / departmentChange)    EmployeeList (output delete) ─► deleteEmployee(id)
  └─► searchByName / searchByDepartment         EmployeeList (output sortChange) ─► sortBySurname(dir)
EmployeeForm (output submitted) ─► EmployeePage ─► addEmployee() ─► status message + form.reset()
```

Rules:

- **Signals for all state; no RxJS in app code.** Search is instant over in-memory data, so no debounce stream is needed. RxJS remains only where Angular APIs require it.
- **`computed` for every derived value**, `linkedSignal` for local state that must reset when its source changes; never `effect` to copy one signal into another. There is no `effect` in the app.
- **No NgRx / signal-store library.** One collection with two mutations does not justify it.
- **Filter state lives in the root service** and resets on page reload. Each criterion is its own signal, so each child binding updates only when its own value changes. Optional later: mirror it to URL query params (`?q=&dept=&sort=`) for shareable, back-button-friendly searches.
- **Forms:** typed reactive forms, because they are stable and well supported. Angular Signal Forms can replace them later if the team adopts them; the `EmployeeForm` boundary (emits `NewEmployee`) means the page and service won't change.

---

## 6. Decisions, trade-offs and extension points

| Decision | Alternative rejected | Why |
|----------|----------------------|-----|
| Single signal service | NgRx / repository + facade layers | One collection, two mutations; extra layers add indirection only |
| Search/sort as service state + `computed` | Separate query module; filtering in templates | One derived list for every view; searches combine; still tested through the public API |
| Container/presentational split | Logic in every component | Presentational components are trivial to test and reuse |
| Inline delete confirm | Modal dialog / `window.confirm` | Accessible, no dialog infrastructure, testable in jsdom |
| Free-text department | Closed department list | Required by `project-assumptions.md`; no list to maintain |
| No `core/` / `shared/` yet | Full enterprise skeleton | Nothing to put in them yet |

Extension points (not built now):

- **Persistence:** add `load()`/`save()` to `EmployeeService`, or an injected `StorageAdapter` once there are two implementations (memory + localStorage/HTTP).
- **Edit employee:** route `:id/edit` reusing `EmployeeForm` with an `initialValue` input; service gains `updateEmployee()`.
- **Shareable search:** sync filter signal with query params via router component input binding.

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data lost on reload (in-memory by design) | Low (accepted) | Seed data; clear extension point for persistence |
| Locale/accent handling in search and sort | Medium | `Intl.Collator` + `normalize('NFD')`; covered by edge-case tests (`Åberg`, `O'Brien`, `de Vries`) |
| Large lists rendering slowly | Low | `track employee.id`, OnPush, cached search index; 1000-employee tests; virtual scroll only if needed |
| `crypto.randomUUID` needs a secure context | Low | HTTPS is mandated by `security-guidelines.md`; `localhost` is secure; use `ng serve --ssl` for LAN testing |
| Inconsistent department spelling (`HR` vs `Human Resources`) | Low | "Contains" search; optional `<datalist>` of existing departments on the form later |
| Duplicate employees | Low | Allowed: uniqueness is by generated id (`project-assumptions.md`) |

## 8. Test strategy (hand-off to tester agent)

- `employee.model.spec.ts` — domain validation, trimming, error messages.
- `employee.service.spec.ts` — F1–F5, immutability, ID assignment, combined filters, edge cases.
- `employee-form.spec.ts` — validation, boundaries, trimming, a11y attributes, submit/reset.
- `search-panel.spec.ts`, `employee-list.spec.ts` — a11y, two-way binding, sort, delete confirm, focus management, row tracking, edge cases.
- `app.spec.ts` — shell landmarks and skip link.
- `employee-page.spec.ts` — integration of form, search, list, delete confirm, add announcements and error handling.
- Target: ≥ 90 % on `data/` and components (estimated ~100 % of statements; not measured, because `@vitest/coverage-v8` is not installed).

## 9. Implementation order

1. Model, seed + tests ✔
2. `EmployeeService` + tests ✔
3. Presentational components: `EmployeeForm` ✔, `SearchPanel` ✔, `EmployeeList` ✔ (sort header, delete confirm) + tests
4. `EmployeePage`, routes, shell ✔
5. Code-reviewer and tester agent passes ✔ (findings and outcomes in `architecture-review.md`)
