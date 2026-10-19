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
import { AppComponent, PREVIEW_RANKLIST } from '../../../dev/app.component';
import { makePreviewRanklist } from '../../../../../tests/shared/preview-ranklist-fixture';
import type * as srk from '@algoux/standard-ranklist';

interface RenderedApp {
  appRef: ApplicationRef;
  componentRef: ComponentRef<AppComponent>;
  hostElement: HTMLElement;
}

const renderedApps: RenderedApp[] = [];
const originalMatchMedia = window.matchMedia;

async function renderDevApp(data: srk.Ranklist = makePreviewRanklist()) {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  const appRef = await createApplication({ providers: [{ provide: PREVIEW_RANKLIST, useValue: data }] });
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

  it('keeps the manual CCPC26 preview switch synchronized with replay and clears stale details', async () => {
    const data = makePreviewRanklist();
    data.sorter = {
      algorithm: 'ICPC',
      config: { extendedAlgorithms: [{ algorithm: 'CCPC26', config: { problemRevealAcceptedThreshold: { count: 2 } } }] },
    };
    const { componentRef, hostElement } = await renderDevApp(data);
    const app = componentRef.instance;
    const toggle = () => hostElement.querySelector<HTMLInputElement>('input[aria-label="CCPC26 mode"]')!;
    const labels = () => Array.from(hostElement.querySelectorAll('thead .srk-problem-header')).map((cell) => cell.textContent?.trim());
    expect(toggle().checked).toBe(false);
    (hostElement.querySelector('thead .srk-problem-header') as HTMLElement).click();
    expect(app.activeProblemClick).not.toBeNull();
    toggle().checked = true;
    toggle().dispatchEvent(new Event('change', { bubbles: true }));
    componentRef.changeDetectorRef.detectChanges();
    expect(app.activeProblemClick).toBeNull();
    expect(labels()).toEqual(['', '']);
    (hostElement.querySelector('tbody .srk-prest-status-block') as HTMLElement).click();
    componentRef.changeDetectorRef.detectChanges();
    expect(app.activeSolutionClick?.problemRevealed).toBe(false);
    expect(hostElement.querySelector('.srk-modal-title')?.textContent).toBe('Solutions (Preview Team)');
    app.setCCPC26Mode(false);
    componentRef.changeDetectorRef.detectChanges();
    expect(app.activeSolutionClick).toBeNull();
    expect(toggle().checked).toBe(false);
    for (const [time, enabled] of [[7 * 60_000, true], [8 * 60_000, false], [0, true], [null, false]] as const) {
      app.handleTimeTravel(time);
      componentRef.changeDetectorRef.detectChanges();
      expect(toggle().checked).toBe(enabled);
      expect(labels().every((label) => label === '')).toBe(enabled);
    }
    app.setCCPC26Mode(true);
    app.useBaselineOptions();
    app.useShowcaseOptions();
    expect(app.enableCCPC26).toBe(true);
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

  it('renders the preview ranklist table with the synthetic fixture', async () => {
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
    expect(componentRef.instance.language).toBe('browser');

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
    expect(getSelect('Language').value).toBe('browser');

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
    componentRef.instance.language = 'zh-CN';
    componentRef.changeDetectorRef.detectChanges();
    expect(componentRef.instance.statusCellPreset).toBe('minimal');
    expect(componentRef.instance.emptyStatusPlaceholder).toBe('-');
    expect(componentRef.instance.userAvatarPlacement).toBe('user');
    expect(componentRef.instance.language).toBe('zh-CN');
    expect(getSelect('Status preset').value).toBe('minimal');
    expect(getSelect('Empty status placeholder').value).toBe('-');
    expect(getSelect('User avatar placement').value).toBe('user');
    expect(getSelect('Language').value).toBe('zh-CN');
    expect(hostElement.textContent).toContain('测试队伍');

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

  it('opens the custom problem modal from a problem header click', async () => {
    const { componentRef, hostElement } = await renderDevApp();
    const problemHeader = hostElement.querySelector('th.srk-problem-header') as HTMLElement | null;

    expect(problemHeader).toBeTruthy();
    problemHeader!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 20, clientY: 30 }));
    componentRef.changeDetectorRef.detectChanges();

    expect(componentRef.instance.activeProblemClick).not.toBeNull();
    expect(hostElement.querySelector('.srk-general-modal-root')).toBeTruthy();
    expect(hostElement.querySelector('.srk-problem-modal')).toBeTruthy();
    expect(hostElement.textContent).toContain('Problem Info');
    expect(hostElement.textContent).toContain('Alias: A');
    expect(hostElement.textContent).toContain('Title: Preview Problem');
    expect(hostElement.textContent).toContain('Link: https://example.com/problem-a');
    expect(hostElement.textContent).toContain('Stats: 1 accepted / 1 submitted');
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
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    componentRef.changeDetectorRef.detectChanges();

    expect(hostElement.querySelector('tbody tr')?.textContent).not.toBe(firstRowBefore);
    expect(hostElement.querySelector('.srk-progress-time-machine-status')).not.toBeNull();
  });
});
