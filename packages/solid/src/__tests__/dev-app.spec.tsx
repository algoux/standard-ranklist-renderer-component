import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'solid-js/web';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import App from '../../dev/App';

function renderSolidApp() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(() => <App />, root);
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
  const button = Array.from(container.querySelectorAll('button')).find(
    (item) => item.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Button "${label}" was not found`);
  }

  return button;
}

describe('Solid local demo app', () => {
  afterEach(() => {
    document.body.innerHTML = '';
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
    expect(root.textContent).toContain('中二之力');

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
});
