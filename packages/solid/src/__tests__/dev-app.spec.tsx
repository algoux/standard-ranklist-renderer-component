import { fireEvent, waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'solid-js/web';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';

import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';

const { default: App } = await import('../../dev/App');

function renderSolidApp() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(() => <App initialRanklist={makePreviewRanklist()} />, root);
  return { root, dispose };
}

function getField(container: HTMLElement, label: string) {
  const field = container.querySelector(`[aria-label="${label}"]`);

  if (!field) {
    throw new Error(`Field "${label}" was not found`);
  }

  return field;
}

function getButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.trim() === label);

  if (!button) {
    throw new Error(`Button "${label}" was not found`);
  }

  return button;
}

describe('Solid local demo app', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    document.body.removeAttribute('style');
    resetModalInteractionStateForTests();
  });

  it('renders interactive examples for the new Ranklist render option props', async () => {
    const { root, dispose } = renderSolidApp();
    await Promise.resolve();

    expect((getField(root, 'Split organization') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Custom column titles') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Text status colors') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Problem statistics footer') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Dirt column') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'SE column') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Row borders') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Column borders') as HTMLInputElement).checked).toBe(true);
    expect((getField(root, 'Status preset') as HTMLSelectElement).value).toBe('compact');
    expect((getField(root, 'Empty status placeholder') as HTMLSelectElement).value).toBe('·');
    expect((getField(root, 'User avatar placement') as HTMLSelectElement).value).toBe('organization');
    expect((getField(root, 'Language') as HTMLSelectElement).value).toBe('browser');

    expect(root.querySelector('th.srk-organization-header')?.textContent).toContain('School');
    expect(root.querySelector('th.srk-dirt-header')?.textContent).toContain('Dirt');
    expect(root.querySelector('th.srk-se-header')?.textContent).toContain('SE');
    expect(root.querySelector('tfoot')).toBeTruthy();
    expect(root.querySelector('td.srk-prest-status-block-color-text')).toBeTruthy();
    expect(root.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
    expect(root.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);
    expect(Array.from(root.querySelectorAll('tbody td')).some((cell) => cell.textContent === '·')).toBe(true);

    expect(root.querySelector('.srk-prest-status-block-secondary')).toBeTruthy();

    fireEvent.change(getField(root, 'Status preset'), { target: { value: 'minimal' } });
    expect((getField(root, 'Status preset') as HTMLSelectElement).value).toBe('minimal');

    fireEvent.change(getField(root, 'Empty status placeholder'), { target: { value: '-' } });
    expect((getField(root, 'Empty status placeholder') as HTMLSelectElement).value).toBe('-');

    fireEvent.change(getField(root, 'User avatar placement'), { target: { value: 'user' } });
    expect((getField(root, 'User avatar placement') as HTMLSelectElement).value).toBe('user');
    const languageSelect = getField(root, 'Language') as HTMLSelectElement;
    languageSelect.value = 'zh-CN';
    languageSelect.dispatchEvent(new Event('input', { bubbles: true }));
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(languageSelect.value).toBe('zh-CN');
    expect(root.textContent).toContain('测试队伍');

    getButton(root, 'Baseline').click();
    await Promise.resolve();

    expect((getField(root, 'Split organization') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Custom column titles') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Text status colors') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Problem statistics footer') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Dirt column') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'SE column') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Row borders') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Column borders') as HTMLInputElement).checked).toBe(false);
    expect((getField(root, 'Status preset') as HTMLSelectElement).value).toBe('classic');
    expect((getField(root, 'Empty status placeholder') as HTMLSelectElement).value).toBe('');
    expect((getField(root, 'User avatar placement') as HTMLSelectElement).value).toBe('user');
    dispose();
  });

  it('opens the custom problem modal from a problem header click', async () => {
    const { root, dispose } = renderSolidApp();
    await Promise.resolve();

    const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    expect(problemHeader?.classList.contains('srk--cursor-pointer')).toBe(true);
    fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.querySelector('.srk-general-modal-root')).toBeTruthy();
    expect(document.body.querySelector('.srk-problem-modal')).toBeTruthy();
    expect(document.body.textContent).toContain('Problem Info');
    await waitFor(() => {
      expect(document.body.textContent).toContain('Alias: A');
      expect(document.body.textContent).toContain('Title: Preview Problem');
      expect(document.body.textContent).toContain('Link: https://example.com/problem-a');
      expect(document.body.textContent).toContain('Stats: 1 accepted / 1 submitted');
    });
    dispose();
  });

  it('anchors the custom problem modal motion to the problem header click point', async () => {
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
      const { root, dispose } = renderSolidApp();
      await Promise.resolve();

      const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
      expect(problemHeader).toBeTruthy();
      fireEvent.click(problemHeader!, { clientX: 60, clientY: 40 });

      await waitFor(() => {
        const dialog = document.body.querySelector('.srk-modal') as HTMLElement | null;
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-x')).toBe('-140px');
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-y')).toBe('-60px');
      });

      dispose();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('closes the custom problem modal from the mask with the shared closing animation', async () => {
    const { root, dispose } = renderSolidApp();
    await Promise.resolve();

    const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const wrap = document.body.querySelector('.srk-problem-modal') as HTMLElement | null;
    expect(wrap).toBeTruthy();
    fireEvent.mouseDown(wrap!);
    await Promise.resolve();

    expect(document.body.querySelector('.srk-animated-modal-root')?.getAttribute('data-srk-modal-state')).toBe(
      'closing',
    );
    dispose();
  });

  it('closes the custom problem modal from the close button with the shared closing animation', async () => {
    const { root, dispose } = renderSolidApp();
    await Promise.resolve();

    const problemHeader = root.querySelector('th.srk-problem-header') as HTMLElement | null;
    expect(problemHeader).toBeTruthy();
    fireEvent.click(problemHeader!, { clientX: 20, clientY: 30 });
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const closeButton = document.body.querySelector('.srk-problem-modal .srk-modal-close') as HTMLElement | null;
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    await Promise.resolve();

    expect(document.body.querySelector('.srk-animated-modal-root')?.getAttribute('data-srk-modal-state')).toBe(
      'closing',
    );
    dispose();
  });
});

describe('Solid CCPC26 preview controls', () => {
  it('toggles manually and follows the exact freeze boundary, rewind and replay exit', async () => {
    const data = makePreviewRanklist();
    const before = JSON.stringify(data);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const dispose = render(() => <App initialRanklist={data} />, root);
    const labels = () =>
      Array.from(root.querySelectorAll('thead .srk-problem-header')).map(
        (cell) => cell.querySelector('span')?.textContent || '',
      );
    const toggle = () => getField(root, 'CCPC26 mode') as HTMLInputElement;
    const selectMinute = (minute: number) => {
      const slider = root.querySelector<HTMLInputElement>('[aria-label="Time Travel"]')!;
      fireEvent.mouseDown(slider);
      fireEvent.input(slider, { target: { value: String(minute) } });
      fireEvent.mouseUp(slider);
    };
    try {
      await Promise.resolve();
      expect(labels()).toEqual(['A', 'B']);
      fireEvent.click(toggle());
      expect(labels()).toEqual(['', '']);
      fireEvent.click(toggle());
      expect(labels()).toEqual(['A', 'B']);
      for (const [minute, enabled] of [
        [0, true],
        [7, true],
        [8, false],
        [7, true],
        [10, false],
      ] as const) {
        selectMinute(minute);
        expect(toggle().checked).toBe(enabled);
        expect(labels()).toEqual(enabled ? ['', ''] : ['A', 'B']);
      }
      expect(JSON.stringify(data)).toBe(before);
    } finally {
      dispose();
      root.remove();
    }
  });

  it('passes anonymous details to the modal and closes details when toggling the mode', async () => {
    const { root, dispose } = renderSolidApp();
    try {
      await Promise.resolve();
      fireEvent.click(getField(root, 'CCPC26 mode'));
      fireEvent.click(root.querySelector('tbody .srk-prest-status-block-accepted')!);
      expect(root.querySelector('.srk-solutions-modal .srk-modal-title')?.textContent).toBe('Solutions (Preview Team)');
      fireEvent.click(getField(root, 'CCPC26 mode'));
      expect(
        root
          .querySelector('.srk-solutions-modal')
          ?.closest('.srk-animated-modal-root')
          ?.getAttribute('data-srk-modal-state'),
      ).toBe('closing');
      expect(root.querySelector('.srk-solutions-modal .srk-modal-title')?.textContent).toBe('Solutions (Preview Team)');
    } finally {
      dispose();
      root.remove();
    }
  });
});
