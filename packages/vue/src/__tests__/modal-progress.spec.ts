import type * as srk from '@algoux/standard-ranklist';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DefaultSolutionModal from '../modal/DefaultSolutionModal.vue';
import DefaultUserModal from '../modal/DefaultUserModal.vue';
import Modal from '../modal/Modal.vue';
import ProgressBar from '../progress/ProgressBar.vue';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeAnimatedModalInteractionContract, type AnimatedModalAdapter } from '../../../../tests/shared/animated-modal-contract';
import {
  describeDefaultModalContentContract,
  describeModalComponentContract,
  makeRanklist,
  type ModalComponentAdapter,
  type ModalRenderOptions,
} from '../../../../tests/shared/modal-component-contract';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const makeLocalRanklist = (): srk.Ranklist => clone(basicRanklistJson as srk.Ranklist);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const vueModalAdapter: ModalComponentAdapter = {
  target: 'Vue',
  renderModal(options: ModalRenderOptions = {}) {
    let modalOptions: ModalRenderOptions = { ...options };
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: {
        open: modalOptions.open ?? true,
        title: modalOptions.title ?? 'Standalone Modal',
        width: modalOptions.width,
        rootClassName: modalOptions.rootClassName,
        wrapClassName: modalOptions.wrapClassName,
        style: modalOptions.style,
        closeOnEsc: modalOptions.closeOnEsc,
        closeOnMaskClick: modalOptions.closeOnMaskClick,
      },
      slots: {
        default: modalOptions.body ?? 'Modal body',
      },
    });

    return {
      container: wrapper.element.ownerDocument.body,
      cleanup: () => wrapper.unmount(),
      update: async (nextOptions) => {
        modalOptions = { ...modalOptions, ...nextOptions };
        await wrapper.setProps({
          open: modalOptions.open ?? true,
          title: modalOptions.title ?? 'Standalone Modal',
          width: modalOptions.width,
          rootClassName: modalOptions.rootClassName,
          wrapClassName: modalOptions.wrapClassName,
          style: modalOptions.style,
          closeOnEsc: modalOptions.closeOnEsc,
          closeOnMaskClick: modalOptions.closeOnMaskClick,
        });
        await nextTick();
      },
      getCloseReasons: () => (wrapper.emitted('close') || []).map((event) => event[0] as string),
      clickCloseButton: () => wrapper.find('button[aria-label="Close"]').trigger('click'),
      triggerMaskMouseDown: () => wrapper.find('.srk-modal-wrap').trigger('mousedown'),
      triggerEscape: () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      },
    };
  },
  renderDefaultUserModal() {
    const ranklist = makeRanklist();
    const wrapper = mount(DefaultUserModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
        formatSrkAssetUrl: (url: string, field: string) => `proxied:${field}:${url}`,
      },
    });

    return {
      container: wrapper.element,
      cleanup: () => wrapper.unmount(),
      getPhotoSrc: () => wrapper.find('img[alt="User portrait"]').attributes('src') || null,
    };
  },
  renderDefaultSolutionModal() {
    const ranklist = makeRanklist();
    const wrapper = mount(DefaultSolutionModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        problem: ranklist.problems[0],
        problemIndex: 0,
        solutions: [...(ranklist.rows[0].statuses[0].solutions || [])].reverse(),
      },
    });

    return {
      container: wrapper.element,
      cleanup: () => wrapper.unmount(),
    };
  },
};

describeModalComponentContract(vueModalAdapter);
describeDefaultModalContentContract(vueModalAdapter);

const vueAnimatedModalAdapter: AnimatedModalAdapter = {
  target: 'Vue',
  renderInteractiveModal(options = {}) {
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: {
        open: options.open ?? true,
        destroyOnClose: options.destroyOnClose,
        title: options.title ?? 'Standalone Modal',
        width: options.width,
      },
      slots: {
        default: options.body ?? 'Modal body',
      },
    });

    return {
      container: wrapper.element.ownerDocument.body,
      cleanup: () => wrapper.unmount(),
      update: async (nextOptions) => {
        await wrapper.setProps({
          open: nextOptions.open ?? true,
          destroyOnClose: nextOptions.destroyOnClose,
          title: nextOptions.title ?? 'Standalone Modal',
          width: nextOptions.width,
        });
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await nextTick();
      },
    };
  },
  renderInteractiveDefaultUserModal() {
    const ranklist = makeRanklist();
    const wrapper = mount(DefaultUserModal, {
      attachTo: document.body,
      props: {
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
      },
    });

    return {
      container: wrapper.element.ownerDocument.body,
      cleanup: () => wrapper.unmount(),
      closeAndClearUser: async () => {
        await wrapper.setProps({
          open: false,
          user: null,
        });
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await nextTick();
      },
    };
  },
};

describeAnimatedModalInteractionContract(vueAnimatedModalAdapter);

describe('Vue modal and progress components', () => {
  it('emits time-travel changes from the internal range input', async () => {
    const ranklist = makeLocalRanklist();
    const wrapper = mount(ProgressBar, {
      props: {
        data: ranklist,
        enableTimeTravel: true,
      },
    });

    const slider = wrapper.find('input[type="range"]');
    await slider.trigger('mousedown');
    await slider.setValue('120');
    await slider.trigger('mouseup');

    expect(wrapper.emitted('timeTravel')?.[0]).toEqual([120 * 60 * 1000]);
  });

  it('starts and stops the live timer when the live prop changes', async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const wrapper = mount(ProgressBar, {
      props: {
        data: makeLocalRanklist(),
        live: false,
      },
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();

    await wrapper.setProps({ live: true });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const intervalId = setIntervalSpy.mock.results[0]?.value;

    await wrapper.setProps({ live: false });

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    wrapper.unmount();
  });
});
