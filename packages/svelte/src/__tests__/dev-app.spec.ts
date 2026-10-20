import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';

import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';
import App from '../../dev/App.svelte';

function textOf(element: Element | null | undefined): string {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function getField(container: ParentNode, label: string): HTMLInputElement | HTMLSelectElement {
  const field = Array.from(container.querySelectorAll('label')).find((candidate) => textOf(candidate).includes(label));
  expect(field).toBeTruthy();
  const control = field?.querySelector('input, select') as HTMLInputElement | HTMLSelectElement | null;
  expect(control).toBeTruthy();
  return control!;
}

function getButton(container: ParentNode, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => textOf(candidate) === text);
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function getAcceptedStatusCell(container: ParentNode): HTMLElement {
  const statusCell = container.querySelector('tbody td.srk-prest-status-block-accepted') as HTMLElement | null;
  expect(statusCell).toBeTruthy();
  return statusCell!;
}

describe('Svelte local demo app', () => {
  afterEach(() => {
    cleanup();
    resetModalInteractionStateForTests();
  });

  it('renders interactive examples for the new Ranklist render option props', async () => {
    const { container } = render(App, { props: { initialRanklist: makePreviewRanklist() } });

    expect((getField(container, 'Split organization') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Custom column titles') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Text status colors') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Problem statistics footer') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Dirt column') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'SE column') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Row borders') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Column borders') as HTMLInputElement).checked).toBe(true);
    expect((getField(container, 'Status preset') as HTMLSelectElement).value).toBe('compact');
    expect((getField(container, 'Empty status placeholder') as HTMLSelectElement).value).toBe('·');
    expect((getField(container, 'User avatar placement') as HTMLSelectElement).value).toBe('organization');
    expect((getField(container, 'Language') as HTMLSelectElement).value).toBe('browser');

    expect(container.querySelector('th.srk-organization-header')?.textContent).toContain('School');
    expect(container.querySelector('th.srk-dirt-header')?.textContent).toContain('Dirt');
    expect(container.querySelector('th.srk-se-header')?.textContent).toContain('SE');
    expect(container.querySelector('tfoot')).toBeTruthy();
    expect(container.querySelector('td.srk-prest-status-block-color-text')).toBeTruthy();
    expect(container.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
    expect(container.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);
    expect(Array.from(container.querySelectorAll('tbody td')).some((cell) => cell.textContent === '·')).toBe(true);

    const acceptedScore = getAcceptedStatusCell(container).querySelector('.srk-prest-status-block-score')?.textContent;
    await fireEvent.change(getField(container, 'Status preset'), { target: { value: 'minimal' } });
    await tick();
    expect((getField(container, 'Status preset') as HTMLSelectElement).value).toBe('minimal');
    expect(textOf(getAcceptedStatusCell(container))).toBe(acceptedScore || '+');
    await fireEvent.change(getField(container, 'Empty status placeholder'), { target: { value: '-' } });
    await tick();
    expect((getField(container, 'Empty status placeholder') as HTMLSelectElement).value).toBe('-');
    await fireEvent.change(getField(container, 'User avatar placement'), { target: { value: 'user' } });
    await tick();
    expect((getField(container, 'User avatar placement') as HTMLSelectElement).value).toBe('user');
    await fireEvent.change(getField(container, 'Language'), { target: { value: 'zh-CN' } });
    await tick();
    expect((getField(container, 'Language') as HTMLSelectElement).value).toBe('zh-CN');
    expect(container.textContent).toContain('测试队伍');
    await fireEvent.click(getField(container, 'Custom column titles'));
    await tick();
    expect((getField(container, 'Custom column titles') as HTMLInputElement).checked).toBe(false);
    expect(container.querySelector('th.srk-organization-header')?.textContent).toContain('Organization');
    expect(container.querySelector('th.srk-organization-header')?.textContent).not.toContain('School');
    await fireEvent.click(getField(container, 'Text status colors'));
    await tick();
    expect((getField(container, 'Text status colors') as HTMLInputElement).checked).toBe(false);
    expect(getAcceptedStatusCell(container).classList.contains('srk-prest-status-block-color-text')).toBe(false);

    await fireEvent.click(getButton(container, 'Baseline'));
    await tick();

    expect((getField(container, 'Split organization') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Custom column titles') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Text status colors') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Problem statistics footer') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Dirt column') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'SE column') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Row borders') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Column borders') as HTMLInputElement).checked).toBe(false);
    expect((getField(container, 'Status preset') as HTMLSelectElement).value).toBe('classic');
    expect((getField(container, 'Empty status placeholder') as HTMLSelectElement).value).toBe('');
    expect((getField(container, 'User avatar placement') as HTMLSelectElement).value).toBe('user');
  });

  it('opens the custom problem modal from a problem header click', async () => {
    const { container } = render(App, { props: { initialRanklist: makePreviewRanklist() } });
    const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;

    expect(problemHeader).toBeTruthy();
    await fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });
    await tick();

    expect(container.querySelector('.srk-general-modal-root')).toBeTruthy();
    expect(container.querySelector('.srk-problem-modal')).toBeTruthy();
    expect(container.textContent).toContain('Problem Info');
    expect(container.textContent).toContain('Alias: A');
    expect(container.textContent).toContain('Title: Preview Problem');
    expect(container.textContent).toContain('Link: https://example.com/problem-a');
    expect(container.textContent).toContain('Stats: 1 accepted / 1 submitted');
  });

  it('switches CCPC26 manually and follows the replay freeze boundary in both directions', async () => {
    const ranklist = makePreviewRanklist();
    ranklist.sorter = {
      algorithm: 'ICPC',
      config: {
        extendedAlgorithms: [{ algorithm: 'CCPC26', config: { problemRevealAcceptedThreshold: { count: 2 } } }],
      },
    };
    const before = JSON.stringify(ranklist);
    const { container } = render(App, { props: { initialRanklist: ranklist } });
    const toggle = () => container.querySelector<HTMLInputElement>('[aria-label="CCPC26 mode"]');
    const headers = () =>
      Array.from(container.querySelectorAll('thead .srk-problem-header')).map(
        (cell) => cell.querySelector('span')?.textContent || '',
      );
    const slider = container.querySelector('input[aria-label="Time Travel"]')!;
    async function selectMinute(minute: number) {
      await fireEvent.mouseDown(slider);
      await fireEvent.input(slider, { target: { value: String(minute) } });
      await fireEvent.mouseUp(slider);
      await tick();
    }

    expect(toggle()).toBeNull();
    expect(container.querySelector('.preview-controls [aria-label="CCPC26 mode"]')).toBeNull();
    expect(headers()).toEqual(['A', 'B']);
    await selectMinute(7);
    expect(container.querySelector('.srk-progress-secondary-area-center [role="switch"]')).toBeTruthy();
    expect(toggle()!.checked).toBe(true);
    expect(headers()).toEqual(['', '']);
    await fireEvent.click(getButton(container, 'Baseline'));
    expect(toggle()!.checked).toBe(true);
    await fireEvent.click(toggle()!);
    expect(headers()).toEqual(['A', 'B']);

    await selectMinute(0);
    expect(toggle()!.checked).toBe(true);
    expect(headers()).toEqual(['', '']);
    expect(container.querySelector('tbody .srk-prest-status-block-accepted')).toBeNull();
    await selectMinute(7);
    await fireEvent.click(getAcceptedStatusCell(container));
    expect(textOf(container.querySelector('.srk-modal-title'))).toBe('Solutions (Preview Team)');
    await fireEvent.click(toggle()!);
    await waitFor(() => expect(container.querySelector('.srk-modal-root')).toBeNull());
    expect(headers()).toEqual(['A', 'B']);

    await selectMinute(7);
    expect(toggle()!.checked).toBe(true);
    await fireEvent.click(getAcceptedStatusCell(container));
    await selectMinute(8);
    expect(toggle()!.checked).toBe(false);
    expect(headers()).toEqual(['A', 'B']);
    await waitFor(() => expect(container.querySelector('.srk-modal-root')).toBeNull());
    await selectMinute(7);
    expect(headers()).toEqual(['', '']);
    await selectMinute(10);
    expect(toggle()).toBeNull();
    expect(headers()).toEqual(['A', 'B']);
    expect(container.textContent).not.toContain('Time Travel Mode');
    expect(JSON.stringify(ranklist)).toBe(before);
  });

  it('does not show a CCPC26 switch during replay without the extension declaration', async () => {
    const ranklist = makePreviewRanklist();
    ranklist.sorter = { algorithm: 'ICPC', config: {} };
    const { container } = render(App, { props: { initialRanklist: ranklist } });
    const slider = container.querySelector<HTMLInputElement>('[aria-label="Time Travel"]')!;
    await fireEvent.mouseDown(slider);
    await fireEvent.input(slider, { target: { value: '7' } });
    await fireEvent.mouseUp(slider);
    expect(container.querySelector('.srk-progress-time-machine-text')?.textContent).toBe('Time Travel Mode');
    expect(container.querySelector('[aria-label="CCPC26 mode"]')).toBeNull();
  });
});
