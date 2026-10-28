import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Application shell: header, navigation and the routed page area. */
@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /**
   * Moves focus to the main content without navigating. With `<base href="/">`, a plain `#main-content`
   * link resolves to `/#main-content` and reloads the app, losing all in-memory employees.
   */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
