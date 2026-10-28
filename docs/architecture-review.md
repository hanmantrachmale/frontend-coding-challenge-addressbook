# Address Book — Final Architecture & Code Review

Date: 2026-10-28 · Reviewers: Architect agent + Code Review agent, plus one independent reviewer (fresh context, read-only)
Scope: all of `src/` (app shell, `features/employees/**`, global styles) checked against `CLAUDE.md`, `docs/*.md` and the agent briefs in `.claude/agents/`.

## 1. Verdict

**Approve.** The solution meets every functional requirement (add, delete, search by name, search by department, sort by surname). It follows current Angular practice throughout, and no Critical or Major findings remain open.

- **Major issues found and fixed during this review:** 3.
  1. The skip link reloaded the app and wiped in-memory data.
  2. After a successful add submitted with Enter, the form showed a false "required" error.
  3. The test suite was red.
- **Minor issues fixed:** 9.
- **Declined with a recorded reason:** 5.
- **Open:** 2, and both need a decision from the project owner (logging, coverage tool).

| Metric | Value |
|---|---|
| Unit tests | **290 passed / 290** (7 spec files) |
| Coverage | Estimated ~100% of statements and ≥95% of branches on business logic. Not measured, because `@vitest/coverage-v8` is not installed. |
| Production code / test code | 782 / 2,125 lines of TypeScript |
| Initial bundle | 251 kB raw / 70 kB transferred |
| Lazy `employees` chunk | 59 kB raw / 14 kB transferred |
| Global CSS | 3.4 kB raw / 0.9 kB transferred |
| Anti-pattern scan in app code | None found: no `any`, `@ts-ignore`, `innerHTML`, `console.*`, manual `subscribe`, `effect`, `*ngIf`/`*ngFor`, decorator inputs, `NgModule` or `TODO` |

## 2. Scorecard

| Dimension | Rating | Evidence |
|---|---|---|
| **Angular latest practices** | ✅ Strong | <ul><li>Standalone, `OnPush` components everywhere.</li><li>`inject()`, plus signal-based `input()`, `output()` and `model()`.</li><li>Signal queries: `viewChild`, `viewChildren`.</li><li>Built-in control flow (`@if`, `@for … track`, `@let`).</li><li>Zoneless change detection.</li><li>Lazy feature route, route `title`s and `afterNextRender` for focus.</li><li>Angular 20+ file naming.</li></ul> |
| **Signals usage** | ✅ Strong | <ul><li>All state lives in signals and is exposed read-only.</li><li>Derived values use `computed`: a chained `searchIndex → matchingEmployees → filteredEmployees`.</li><li>`linkedSignal` holds the pending-delete state.</li><li>No `effect`, and no RxJS in app code.</li><li>Primitive per-criterion signals mean that setting an unchanged value causes no re-render.</li></ul> |
| **Accessibility (WCAG 2.2 AA)** | ✅ Strong | <ul><li>Landmarks: `header`, `nav`, `main`, `search`, plus labelled sections.</li><li>Skip link; one `<h1>`.</li><li>Labelled inputs with hints, using `aria-describedby`, `aria-invalid` and `aria-required`.</li><li>Focus moves to the first invalid field.</li><li>A table caption, `scope`, and `aria-sort` on a real button.</li><li>Inline delete confirm with managed focus and Escape.</li><li>Polite live regions; contrast ratios verified (4.5:1 text, 3:1 UI).</li><li>44px controls, `forced-colors` and `prefers-reduced-motion` support.</li></ul> |
| **SOLID** | ✅ Good | <ul><li>**S:** separate model, service, presentation and container. **O:** field rendering is config-driven. **I:** children see only their inputs and outputs. **D:** children never touch the service.</li><li>Abstractions with only one implementation (repository, `StorageAdapter`, `IdGenerator`) were deliberately not added (see §5).</li></ul> |
| **Maintainability** | ✅ Good | <ul><li>Each validation rule is defined once (`validateEmployeeField`), and both the form and `createEmployee` use it.</li><li>One `fullName()` helper and one set of style tokens.</li><li>Every public API has a JSDoc comment.</li><li>`architecture.md` matches the code.</li></ul> |
| **Testability** | ✅ Strong | <ul><li>The domain logic is pure functions; the service has a synchronous signal API.</li><li>Presentation components are dumb, so they can be tested in isolation.</li><li>The tests cover the happy path, validation, boundaries, edge cases, the 1,000-row limit, XSS rendering, focus management and live-region announcements.</li></ul> |
| **Performance** | ✅ Good for the stated scale (< 1,000 employees) | <ul><li>`OnPush` plus signals.</li><li>The search index is cached per employees change, and a sort change doesn't re-filter.</li><li>`track employee.id` reuses DOM rows (tested).</li><li>Lazy feature chunk; a 0.9 kB CSS transfer; no UI library.</li></ul> |

## 3. Findings and outcomes

### 3.1 Fixed during this review

| # | Source | Severity | Area | Finding | Fix |
|---|---|---|---|---|---|
| R1 | Independent | **Major** | Bug / A11y | The skip link `href="#main-content"` resolved against `<base href="/">` to `/#main-content`. Using it caused a full reload, wiping all added employees, and focus never reached `<main>`. | `app.ts` `skipToMain()` calls `preventDefault()` and focuses `<main>`. A test checks this. |
| R2 | Tester D1 + Independent | **Major** | Bug | `EmployeeForm.reset()` moved focus *after* resetting. The blur on the previously focused field marked it touched again, so a successful add submitted with Enter showed "… is required." Separately, calling `reset()` from outside the form never re-rendered its `OnPush` view. | Focus first, then `form.reset()`, then `markForCheck()`. Covered by a component test plus a page test that submits with Enter. |
| R3 | Independent | Major | Tests | The suite was red (1 failing test) partway through the review. | Resolved by R2; 290/290 pass. |
| R4 | Review #3 / D2 | Minor | Search | A name typed with extra inner spaces (`liam   o'brien`) found nothing. | `normalizeForSearch` collapses whitespace. |
| R5 | Review #4 / D3 | Minor | Immutability | The seed records were only read-only at compile time. | The seed is built with `createEmployee` (validated and frozen) and the array is frozen too. |
| R6 | Review #1, #2 | Minor | Performance / Signals | One filter-object signal meant a sort change re-ran the filter, and every keystroke normalized every employee again. Setting an unchanged value still re-rendered. | Three primitive signals plus a chain of cached `computed` steps. A test checks that the same filtered array comes back when nothing changed. |
| R7 | Review #6 | Suggestion | Determinism | The id tiebreak used `localeCompare`, which depends on locale. | Plain `<`/`>` comparison (`compareIds`). |
| R8 | Independent #4 | Minor | A11y / Privacy | The form used `given-name`, `family-name`, `tel` and `organization-title` autocomplete tokens. Those describe the *user*, so the browser offered the user's own details for a colleague. `organization-title` also means job title, not department. | `autocomplete="off"` on all fields, with the reason in a comment. |
| R9 | Independent #5 | Minor | A11y | <ul><li>After a delete, focus went to a live region, causing a stacked triple announcement.</li><li>Deleting a second person with the same name announced nothing.</li><li>The code contradicted the architecture doc, which says focus moves to the next row.</li></ul> | <ul><li>Focus moves to the next row's Delete button, then the previous row's, then the summary.</li><li>The status is cleared and then set, so repeats are announced.</li><li>The summary is `aria-atomic`.</li></ul> All three behaviours are tested. |
| R10 | Independent #13 | Suggestion | Signals / UX | A delete confirmation hidden by a search came back later, without focus. | `pendingDeleteId` is now a `linkedSignal` over `employees` and resets automatically. Tested. |
| R11 | Independent #7 | Minor | Signals | The page re-derived each criterion from a `filter` object that is rebuilt on every change. | The service exposes read-only `nameQuery`, `departmentQuery` and `sortDirection`, and the page binds to them directly. |
| R12 | Independent #10 | Minor | UX copy | The alert said "Check the highlighted fields", but no fields are highlighted when the *service* rejects data. | Now: "The employee could not be added. Please check the details and try again." |
| R13 | Independent #11 | Suggestion | Duplication | The full name was built in 4 places. | A single `fullName()` in `employee.model.ts`, used by the service, page and list. |
| R14 | Independent #6 | Minor | Docs | `architecture.md` described a single `filterState`, an outdated focus flow and a removed route. | `architecture.md` updated in 25 places and marked *Implemented*. |

### 3.2 Declined, with reasons

| # | Finding | Why declined |
|---|---|---|
| X1 | Remove `SearchPanel.criteria` / `SearchCriteria` as unused (independent #8) | The requirement for this component explicitly said "Expose filter state". It's a two-line `computed`, it's tested, and it's the panel's public contract. |
| X2 | Read the error code from `control.errors` instead of calling the validator again in `errorMessage()` (independent #9) | That would need a cast from `ValidationErrors` (`any`). The extra work is four O(1) checks per render. Type safety matters more here than a micro-optimization. |
| X3 | Make the full name the row header (independent #12) | Hidden text in the first-name cell would be read twice as users move across the row. Rows are still told apart by the other cells. Revisit if user testing shows confusion. |
| X4 | Move focus to the form when the header's "Add employee" link is used (independent #14) | Anchor scrolling already brings the form into view. Handling focus across the router and fragment would mean an RxJS-to-signal bridge plus an `effect` for a minor gain. It's a candidate for a future routed "add" view. |
| X5 | Inject an id generator instead of calling `crypto.randomUUID()` (review #5) | That would be a second abstraction with only one implementation, and tests already replace it with `vi.spyOn`. The secure-context limitation is recorded as a risk in `architecture.md` §7 (HTTPS is mandated; `localhost` is secure). |

### 3.3 Open — needs a decision

| # | Item | Guideline | Recommendation |
|---|---|---|---|
| O1 | No logging | `ai-agent-guidelines.md` ("Generate: Logging"), `engineering-constitution.md` ("Structured logging required") | Add a small `LoggerService`, injected only into `EmployeePage` and `EmployeeService`. Log actions and ids only, never names or phone numbers (`security-guidelines.md`: no PII in logs). Feed it into a real sink later (OpenTelemetry per the constitution). |
| O2 | Coverage not measured | Target 90%+ | Approve adding `@vitest/coverage-v8` as a dev dependency (`security-guidelines.md` requires approval for new dependencies), then run `ng test --coverage`, ideally as a CI gate. |

## 4. Guideline compliance

| Rule | Source | Status |
|---|---|---|
| Angular latest, standalone, signals, reactive forms, in-memory storage, strict TypeScript | `CLAUDE.md`, ADR-001…004 | ✅ |
| Pages under `features/*/pages`, reusable components under `features/*/components` | `frontend-guidelines.md` | ✅ |
| `ChangeDetectionStrategy.OnPush` everywhere | `frontend-guidelines.md` | ✅ |
| Only services call `HttpClient` | `frontend-guidelines.md` | ✅ (no HTTP) |
| Input validation | Constitution, security | ✅ Domain rules enforced in both the form and the service |
| Output encoding; no `innerHTML`, `eval` or `Function` | `security-guidelines.md` | ✅ Interpolation only; XSS rendering test |
| No secrets; no PII logged | `security-guidelines.md` | ✅ Error messages list field names only |
| No new dependencies | `ai-agent-guidelines.md`, security | ✅ No UI library; coverage tool pending approval (O2) |
| Doc comments, unit tests, validation, error handling | `ai-agent-guidelines.md` | ✅ |
| Logging | `ai-agent-guidelines.md`, constitution | ⚠️ Open (O1) |
| No TODOs, placeholder methods or unused abstractions | `ai-agent-guidelines.md` | ✅ |
| SOLID / DRY | Constitution | ✅ (§2) |
| CancellationToken, OpenTelemetry, correlation IDs, API standards | Constitution, `api-standards.md` | N/A. No backend or API in this POC; revisit when persistence is added. |

## 5. Over-engineering check

These were deliberately **not** built. Each would add structure without solving a current problem:
- **NgRx or a signal-store library:** there's one collection with two mutations.
- **Repository, `StorageAdapter` or `IdGenerator` interfaces:** each would have only one implementation.
- **`core/` and `shared/` folders, or barrel files:** there's a single feature.
- **Separate list and add routes:** one page meets the requirements.
- **A dialog service for delete confirmation:** the inline confirm is simpler and more accessible.

## 6. Recommended next steps

1. **Decide O1 (logging) and O2 (coverage tool).** Both are small.
2. **Check the UI in a real browser:** focus rings, mobile layout, and screen-reader announcements with NVDA or VoiceOver. jsdom can't verify these.
3. **Before persistence or HTTP lands:** introduce `StorageAdapter` only then, since there will be a second implementation. Apply `api-standards.md` and the backend guidelines, and add correlation ids to the logger.
4. **Optional UX:** a `<datalist>` of existing departments on the form, to reduce `HR` vs `Human Resources` drift. Also mirror the search to URL query parameters so searches can be shared.
