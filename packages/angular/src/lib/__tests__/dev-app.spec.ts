import 'zone.js';
import '@angular/compiler';
import {
  createComponent,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { EnumTheme } from '@algoux/standard-ranklist-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { AppComponent } from '../../../dev/app.component';

interface RenderedApp {
  appRef: ApplicationRef;
  componentRef: ComponentRef<AppComponent>;
  hostElement: HTMLElement;
}

const renderedApps: RenderedApp[] = [];
const originalMatchMedia = window.matchMedia;

async function renderDevApp() {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  const appRef = await createApplication();
  const componentRef = createComponent(AppComponent, {
    environmentInjector: appRef.injector,
    hostElement,
  });
  appRef.attachView(componentRef.hostView);
  componentRef.changeDetectorRef.detectChanges();
  const rendered = { appRef, componentRef, hostElement };
  renderedApps.push(rendered);
  return rendered;
}

describe('Angular dev app', () => {
  afterEach(() => {
    for (const rendered of renderedApps.splice(0)) {
      rendered.appRef.detachView(rendered.componentRef.hostView);
      rendered.componentRef.destroy();
      rendered.appRef.destroy();
      rendered.hostElement.remove();
    }
    window.matchMedia = originalMatchMedia;
  });

  it('resolves the preview theme from the system dark preference', async () => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    const { componentRef } = await renderDevApp();

    expect((componentRef.instance as any).preferredTheme).toBe(EnumTheme.dark);
  });

  it('falls back to light theme when the system preference is unavailable', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    const { componentRef } = await renderDevApp();

    expect((componentRef.instance as any).preferredTheme).toBe(EnumTheme.light);
  });

  it('renders the preview ranklist table with the demo data', async () => {
    const { hostElement } = await renderDevApp();

    expect(hostElement.querySelector('.srk-progress-bar')).not.toBeNull();
    expect(hostElement.querySelector('srk-ranklist table')).not.toBeNull();
  });

  it('updates the preview modal from ranklist click events', async () => {
    const { componentRef, hostElement } = await renderDevApp();

    (hostElement.querySelector('tbody td.srk-user-cell') as HTMLElement).click();
    expect(componentRef.instance.activeUserClick).not.toBeNull();

    componentRef.changeDetectorRef.detectChanges();
    expect(hostElement.querySelector('.srk-modal-root')).not.toBeNull();
  });

  it('applies default modal widths like the other framework previews', async () => {
    const { componentRef, hostElement } = await renderDevApp();

    (hostElement.querySelector('tbody td.srk-user-cell') as HTMLElement).click();
    componentRef.changeDetectorRef.detectChanges();

    expect((hostElement.querySelector('.srk-modal') as HTMLElement).style.width).toBe('420px');
  });

  it('keeps the static ranklist cached across unrelated change detection passes', async () => {
    const { componentRef } = await renderDevApp();
    const firstStaticRanklist = componentRef.instance.staticRanklist;

    componentRef.instance.activeUserClick = {
      user: firstStaticRanklist.rows[0].user,
      row: firstStaticRanklist.rows[0],
      rowIndex: 0,
      ranklist: firstStaticRanklist,
    };
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.staticRanklist).toBe(firstStaticRanklist);
  });

  it('updates the preview ranklist from progress time travel events', async () => {
    const { componentRef, hostElement } = await renderDevApp();
    const slider = hostElement.querySelector('input.srk-progress-slider') as HTMLInputElement;
    const firstRowBefore = hostElement.querySelector('tbody tr')?.textContent;

    slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    slider.value = '60';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    componentRef.changeDetectorRef.detectChanges();

    expect(hostElement.querySelector('tbody tr')?.textContent).not.toBe(firstRowBefore);
    expect(hostElement.querySelector('.srk-progress-time-machine-status')).not.toBeNull();
  });
});
