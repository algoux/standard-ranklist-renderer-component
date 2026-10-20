import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import App from '../App';
import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';

function selectTimeTravelMinute(minute: number) {
  const slider = screen.getByRole('slider', { name: 'Time Travel' });
  fireEvent.mouseDown(slider);
  fireEvent.change(slider, { target: { value: `${minute}` } });
  fireEvent.mouseUp(slider);
}

function problemHeaderLabels(container: HTMLElement) {
  return Array.from(container.querySelectorAll('thead th.srk-problem-header')).map(
    (header) => header.firstElementChild?.textContent || '',
  );
}

describe('Local preview app', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:10:00Z').getTime());
  });

  afterEach(() => {
    cleanup();
    resetModalInteractionStateForTests();
    vi.restoreAllMocks();
  });

  it('composes the default user modal from Ranklist click events', () => {
    const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

    const userCell = container.querySelector('tbody td.srk-user-cell') as HTMLElement | null;
    expect(userCell).toBeTruthy();
    fireEvent.click(userCell!);

    expect(screen.getByText('User Info')).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-user-modal')).toBeTruthy();
  });

  it('composes the default solution modal from Ranklist click events', () => {
    const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

    const statusCell = container.querySelector('tbody td.srk-prest-status-block-accepted') as HTMLElement | null;
    expect(statusCell).toBeTruthy();
    fireEvent.click(statusCell!);

    expect(screen.getByText(/Solutions of/)).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-solutions-modal')).toBeTruthy();
  });

  it('composes a custom problem modal from Ranklist problem click events', () => {
    const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

    const problemHeader = container.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    fireEvent.click(problemHeader!);

    expect(screen.getByText('Problem Info')).toBeTruthy();
    expect(screen.getByText('Title: Preview Problem')).toBeTruthy();
    expect(screen.getByText('https://example.com/problem-a')).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-general-modal-root')).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-problem-modal')).toBeTruthy();
  });

  it('uses the first click position for the first modal open after a fresh render', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this instanceof HTMLElement && this.classList.contains('srk-modal')) {
        return {
          x: 200,
          y: 100,
          left: 200,
          top: 100,
          right: 620,
          bottom: 340,
          width: 420,
          height: 240,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    };

    try {
      const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

      const userCell = container.querySelector('tbody td.srk-user-cell') as HTMLElement | null;
      expect(userCell).toBeTruthy();
      fireEvent.click(userCell!, { clientX: 60, clientY: 40 });

      await screen.findByText('User Info');
      await waitFor(() => {
        const dialog = container.ownerDocument.body.querySelector('.srk-modal') as HTMLElement | null;
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-x')).toBe('-140px');
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-y')).toBe('-60px');
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('renders interactive examples for the new Ranklist render option props', () => {
    const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

    expect((screen.getByLabelText('Split organization') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Custom column titles') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Text status colors') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Problem statistics footer') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Dirt column') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('SE column') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Row borders') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Column borders') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Status preset') as HTMLSelectElement).value).toBe('compact');
    expect((screen.getByLabelText('Empty status placeholder') as HTMLSelectElement).value).toBe('·');
    expect((screen.getByLabelText('User avatar placement') as HTMLSelectElement).value).toBe('organization');
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('browser');

    expect(container.querySelector('th.srk-organization-header')?.textContent).toContain('School');
    expect(container.querySelector('th.srk-dirt-header')?.textContent).toContain('Dirt');
    expect(container.querySelector('th.srk-se-header')?.textContent).toContain('SE');
    expect(container.querySelector('tfoot')).toBeTruthy();
    expect(container.querySelector('td.srk-prest-status-block-color-text')).toBeTruthy();
    expect(container.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
    expect(container.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);
    expect(Array.from(container.querySelectorAll('tbody td')).some((cell) => cell.textContent === '·')).toBe(true);
    expect(container.querySelector('td.srk-organization-cell-avatar .srk-user-avatar img')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Status preset'), { target: { value: 'minimal' } });
    expect((screen.getByLabelText('Status preset') as HTMLSelectElement).value).toBe('minimal');
    fireEvent.change(screen.getByLabelText('Empty status placeholder'), { target: { value: '-' } });
    expect((screen.getByLabelText('Empty status placeholder') as HTMLSelectElement).value).toBe('-');
    fireEvent.change(screen.getByLabelText('User avatar placement'), { target: { value: 'user' } });
    expect((screen.getByLabelText('User avatar placement') as HTMLSelectElement).value).toBe('user');
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'zh-CN' } });
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('zh-CN');
    expect(screen.getByText('测试队伍')).toBeTruthy();

    fireEvent.click(screen.getByText('Baseline'));
    expect((screen.getByLabelText('Split organization') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Custom column titles') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Text status colors') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Problem statistics footer') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Dirt column') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('SE column') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Row borders') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Column borders') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Status preset') as HTMLSelectElement).value).toBe('classic');
    expect((screen.getByLabelText('Empty status placeholder') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('User avatar placement') as HTMLSelectElement).value).toBe('user');
  });

  it('supports manual CCPC26 preview and updates the switch when changing replay time', () => {
    const ranklist = makePreviewRanklist();
    const originalRanklist = JSON.stringify(ranklist);
    const { container } = render(<App initialRanklist={ranklist} />);

    expect(problemHeaderLabels(container)).toEqual(['A', 'B']);
    expect(screen.queryByRole('switch', { name: 'CCPC26 mode' })).toBeNull();

    selectTimeTravelMinute(7);
    const toggle = screen.getByRole('switch', { name: 'CCPC26 mode' }) as HTMLInputElement;
    expect(toggle.closest('.srk-progress-secondary-area-center')).toBeTruthy();
    expect(container.querySelector('.preview-controls input[aria-label="CCPC26 mode"]')).toBeNull();
    expect(toggle.checked).toBe(true);
    expect(problemHeaderLabels(container)).toEqual(['', '']);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(problemHeaderLabels(container)).toEqual(['A', 'B']);

    selectTimeTravelMinute(0);
    expect(toggle.checked).toBe(true);
    expect(problemHeaderLabels(container)).toEqual(['', '']);
    expect(container.querySelector('tbody .srk-prest-status-block-accepted')).toBeFalsy();

    selectTimeTravelMinute(7);
    expect(problemHeaderLabels(container)).toEqual(['', '']);
    expect(container.querySelector('tbody .srk-prest-status-block-accepted')).toBeTruthy();

    selectTimeTravelMinute(8);
    expect(toggle.checked).toBe(false);
    expect(problemHeaderLabels(container)).toEqual(['A', 'B']);

    selectTimeTravelMinute(7);
    expect(problemHeaderLabels(container)).toEqual(['', '']);

    selectTimeTravelMinute(10);
    expect(screen.queryByRole('switch', { name: 'CCPC26 mode' })).toBeNull();
    expect(problemHeaderLabels(container)).toEqual(['A', 'B']);
    expect(screen.queryByText('Time Travel Mode')).toBeNull();
    expect(JSON.stringify(ranklist)).toBe(originalRanklist);
  });

  it('keeps replay available without a CCPC26 switch for contests without the declaration', () => {
    const ranklist = makePreviewRanklist();
    ranklist.sorter = { algorithm: 'ICPC', config: {} };
    render(<App initialRanklist={ranklist} />);

    selectTimeTravelMinute(7);
    expect(screen.getByText('Time Travel Mode')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'CCPC26 mode' })).toBeNull();
    expect(screen.queryByLabelText('CCPC26 mode')).toBeNull();
  });

  it('keeps the solution modal anonymous during CCPC26 and clears it when changing the slice', async () => {
    const { container } = render(<App initialRanklist={makePreviewRanklist()} />);

    selectTimeTravelMinute(7);
    fireEvent.click(container.querySelector('tbody .srk-prest-status-block-accepted')!);
    expect(screen.getByText('Solutions (Preview Team)')).toBeTruthy();
    expect(screen.queryByText(/Solutions of/)).toBeNull();

    selectTimeTravelMinute(8);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(container.querySelector('tbody .srk-prest-status-block-accepted')!);
    expect(screen.getByText('Solutions of A (Preview Team)')).toBeTruthy();

    selectTimeTravelMinute(10);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
