import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a skip link to the main content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const skipLink = (fixture.nativeElement as HTMLElement).querySelector('.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#main-content');
  });

  it('moves focus to the main content without navigating when the skip link is used', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    element.querySelector('.skip-link')?.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('main#main-content'));
  });

  it('renders a main navigation link to add an employee', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Main"] a');
    expect(link?.textContent?.trim()).toBe('Add employee');
    expect(link?.getAttribute('href')).toBe('/employees#add-employee');
  });

  it('renders a main landmark containing the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main#main-content');
    expect(main?.querySelector('router-outlet')).not.toBeNull();
  });
});
