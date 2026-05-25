import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import App from '../../dev/App.vue';

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

describe('Vue local demo app', () => {
  afterEach(() => {
    resetModalInteractionStateForTests();
  });

  it('renders interactive examples for the new Ranklist render option props', async () => {
    const wrapper = mount(App);
    const container = wrapper.element as HTMLElement;

    try {
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

      expect(container.querySelector('th.srk-organization-header')?.textContent).toContain('School');
      expect(container.querySelector('th.srk-dirt-header')?.textContent).toContain('Dirt');
      expect(container.querySelector('th.srk-se-header')?.textContent).toContain('SE');
      expect(container.querySelector('tfoot')).toBeTruthy();
      expect(container.querySelector('td.srk-prest-status-block-color-text')).toBeTruthy();
      expect(container.querySelector('table')?.classList.contains('srk-table-row-bordered')).toBe(true);
      expect(container.querySelector('table')?.classList.contains('srk-table-column-bordered')).toBe(true);
      expect(Array.from(container.querySelectorAll('tbody td')).some((cell) => cell.textContent === '·')).toBe(true);

      const statusPreset = getField(container, 'Status preset') as HTMLSelectElement;
      statusPreset.value = 'minimal';
      statusPreset.dispatchEvent(new Event('change', { bubbles: true }));
      await nextTick();
      expect(statusPreset.value).toBe('minimal');

      const emptyPlaceholder = getField(container, 'Empty status placeholder') as HTMLSelectElement;
      emptyPlaceholder.value = '-';
      emptyPlaceholder.dispatchEvent(new Event('change', { bubbles: true }));
      await nextTick();
      expect(emptyPlaceholder.value).toBe('-');

      const avatarPlacement = getField(container, 'User avatar placement') as HTMLSelectElement;
      avatarPlacement.value = 'user';
      avatarPlacement.dispatchEvent(new Event('change', { bubbles: true }));
      await nextTick();
      expect(avatarPlacement.value).toBe('user');

      getButton(container, 'Baseline').click();
      await nextTick();

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
    } finally {
      wrapper.unmount();
    }
  });
});
