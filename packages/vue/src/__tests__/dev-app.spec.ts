import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';

import { makePreviewRanklist } from '../../../../tests/shared/preview-ranklist-fixture';

const { default: App } = await import('../../dev/App.vue');

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
    const wrapper = mount(App, { props: { initialRanklist: makePreviewRanklist() } });
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
      expect((getField(container, 'Language') as HTMLSelectElement).value).toBe('browser');

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

      const language = getField(container, 'Language') as HTMLSelectElement;
      language.value = 'zh-CN';
      language.dispatchEvent(new Event('change', { bubbles: true }));
      await nextTick();
      expect(language.value).toBe('zh-CN');
      expect(container.textContent).toContain('测试队伍');

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

  it('opens the custom problem modal from a problem header click', async () => {
    const wrapper = mount(App, { props: { initialRanklist: makePreviewRanklist() } });
    const container = wrapper.element as HTMLElement;

    try {
      await wrapper.find('th.srk-problem-header').trigger('click', {
        clientX: 20,
        clientY: 30,
      });
      await nextTick();

      expect(container.querySelector('.srk-general-modal-root')).toBeTruthy();
      expect(container.querySelector('.srk-problem-modal')).toBeTruthy();
      expect(container.textContent).toContain('Problem Info');
      expect(container.textContent).toContain('Alias: A');
      expect(container.textContent).toContain('Title: Preview Problem');
      expect(container.textContent).toContain('Link: https://example.com/problem-a');
      expect(container.textContent).toContain('Stats: 1 accepted / 1 submitted');
    } finally {
      wrapper.unmount();
    }
  });
});

describe('Vue CCPC26 preview controls', () => {
  it('toggles manually and follows the exact freeze boundary, rewind and replay exit', async () => {
    const data = makePreviewRanklist();
    const before = JSON.stringify(data);
    const wrapper = mount(App, { props: { initialRanklist: data } });
    const labels = () =>
      wrapper.findAll('thead .srk-problem-header').map((cell) => cell.element.querySelector('span')?.textContent || '');
    const toggle = () => wrapper.find<HTMLInputElement>('[aria-label="CCPC26 mode"]');
    const selectMinute = async (minute: number) => {
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      await slider.trigger('mousedown');
      slider.element.value = String(minute);
      await slider.trigger('input');
      await slider.trigger('mouseup');
    };
    try {
      expect(labels()).toEqual(['A', 'B']);
      expect(toggle().exists()).toBe(false);
      expect(wrapper.find('.preview-controls [aria-label="CCPC26 mode"]').exists()).toBe(false);
      await selectMinute(7);
      expect(wrapper.find('.srk-progress-secondary-area-center [role="switch"]').exists()).toBe(true);
      expect(labels()).toEqual(['', '']);
      await toggle().setValue(false);
      expect(labels()).toEqual(['A', 'B']);
      await toggle().setValue(true);
      expect(labels()).toEqual(['', '']);
      for (const [minute, enabled] of [
        [0, true],
        [7, true],
        [8, false],
        [7, true],
        [10, false],
      ] as const) {
        await selectMinute(minute);
        if (minute === 10) {
          expect(toggle().exists()).toBe(false);
        } else {
          expect(toggle().element.checked).toBe(enabled);
        }
        expect(labels()).toEqual(enabled ? ['', ''] : ['A', 'B']);
      }
      expect(JSON.stringify(data)).toBe(before);
    } finally {
      wrapper.unmount();
    }
  });

  it('passes anonymous details to the modal and closes details when toggling the mode', async () => {
    const wrapper = mount(App, { props: { initialRanklist: makePreviewRanklist() } });
    try {
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      await slider.trigger('mousedown');
      await slider.setValue('7');
      await slider.trigger('mouseup');
      await wrapper.find('tbody .srk-prest-status-block-accepted').trigger('click');
      expect(wrapper.find('.srk-modal-title').text()).toBe('Solutions (Preview Team)');
      await wrapper.find<HTMLInputElement>('[aria-label="CCPC26 mode"]').setValue(false);
      expect(wrapper.find('.srk-animated-modal-root').attributes('data-srk-modal-state')).toBe('closing');
      expect(wrapper.find('.srk-modal-title').text()).toBe('Solutions (Preview Team)');
    } finally {
      wrapper.unmount();
    }
  });

  it('does not show a CCPC26 switch during replay without the extension declaration', async () => {
    const data = makePreviewRanklist();
    data.sorter = { algorithm: 'ICPC', config: {} };
    const wrapper = mount(App, { props: { initialRanklist: data } });
    try {
      const slider = wrapper.find<HTMLInputElement>('[aria-label="Time Travel"]');
      await slider.trigger('mousedown');
      await slider.setValue('7');
      await slider.trigger('mouseup');
      expect(wrapper.find('.srk-progress-time-machine-text').text()).toBe('Time Travel Mode');
      expect(wrapper.find('[aria-label="CCPC26 mode"]').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
