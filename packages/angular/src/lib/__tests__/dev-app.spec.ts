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

  it('renders interactive examples for the new Ranklist render option props', async () => {
    const { componentRef, hostElement } = await renderDevApp();
    const getCheckbox = (label: string) => hostElement.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
    const getSelect = (label: string) => hostElement.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;

    expect(componentRef.instance.splitOrganization).toBe(true);
    expect(componentRef.instance.useCustomColumnTitles).toBe(true);
    expect(componentRef.instance.statusCellPreset).toBe('compact');
    expect(componentRef.instance.statusColorAsText).toBe(true);
    expect(componentRef.instance.showProblemStatisticsFooter).toBe(true);
    expect(componentRef.instance.showDirtColumn).toBe(true);
    expect(componentRef.instance.showSEColumn).toBe(true);
    expect(componentRef.instance.rowBordered).toBe(true);
    expect(componentRef.instance.columnBordered).toBe(true);
    expect(componentRef.instance.emptyStatusPlaceholder).toBe('·');
    expect(componentRef.instance.userAvatarPlacement).toBe('organization');

    expect(getCheckbox('Split organization').checked).toBe(true);
    expect(getCheckbox('Custom column titles').checked).toBe(true);
    expect(getCheckbox('Text status colors').checked).toBe(true);
    expect(getCheckbox('Problem statistics footer').checked).toBe(true);
    expect(getCheckbox('Dirt column').checked).toBe(true);
    expect(getCheckbox('SE column').checked).toBe(true);
    expect(getCheckbox('Row borders').checked).toBe(true);
    expect(getCheckbox('Column borders').checked).toBe(true);
    expect(getSelect('Status preset').value).toBe('compact');
    expect(getSelect('Empty status placeholder').value).toBe('·');
    expect(getSelect('User avatar placement').value).toBe('organization');

    expect(hostElement.querySelector('th.srk-organization-header')?.textContent).toContain('School');
    expect(hostElement.querySelector('th.srk-dirt-header')?.textContent).toContain('Dirt');
    expect(hostElement.querySelector('th.srk-se-header')?.textContent).toContain('SE');
    expect(hostElement.querySelector('tfoot')).toBeTruthy();
    expect(hostElement.querySelector('td.srk-prest-status-block-color-text')).toBeTruthy();
    expect(hostElement.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
    expect(hostElement.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);
    expect(Array.from(hostElement.querySelectorAll('tbody td')).some((cell) => cell.textContent?.trim() === '·')).toBe(true);

    componentRef.instance.statusCellPreset = 'minimal';
    componentRef.instance.emptyStatusPlaceholder = '-';
    componentRef.instance.userAvatarPlacement = 'user';
    componentRef.changeDetectorRef.detectChanges();
    expect(componentRef.instance.statusCellPreset).toBe('minimal');
    expect(componentRef.instance.emptyStatusPlaceholder).toBe('-');
    expect(componentRef.instance.userAvatarPlacement).toBe('user');
    expect(getSelect('Status preset').value).toBe('minimal');
    expect(getSelect('Empty status placeholder').value).toBe('-');
    expect(getSelect('User avatar placement').value).toBe('user');

    componentRef.instance.useBaselineOptions();
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.splitOrganization).toBe(false);
    expect(componentRef.instance.useCustomColumnTitles).toBe(false);
    expect(componentRef.instance.statusCellPreset).toBe('classic');
    expect(componentRef.instance.statusColorAsText).toBe(false);
    expect(componentRef.instance.showProblemStatisticsFooter).toBe(false);
    expect(componentRef.instance.showDirtColumn).toBe(false);
    expect(componentRef.instance.showSEColumn).toBe(false);
    expect(componentRef.instance.rowBordered).toBe(false);
    expect(componentRef.instance.columnBordered).toBe(false);
    expect(componentRef.instance.emptyStatusPlaceholder).toBe(null);
    expect(componentRef.instance.userAvatarPlacement).toBe('user');
    expect(getCheckbox('Split organization').checked).toBe(false);
    expect(getCheckbox('Custom column titles').checked).toBe(false);
    expect(getCheckbox('Text status colors').checked).toBe(false);
    expect(getCheckbox('Problem statistics footer').checked).toBe(false);
    expect(getCheckbox('Dirt column').checked).toBe(false);
    expect(getCheckbox('SE column').checked).toBe(false);
    expect(getCheckbox('Row borders').checked).toBe(false);
    expect(getCheckbox('Column borders').checked).toBe(false);
    expect(getSelect('Status preset').value).toBe('classic');
    expect(getSelect('Empty status placeholder').value).toBe('');
    expect(getSelect('User avatar placement').value).toBe('user');
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
