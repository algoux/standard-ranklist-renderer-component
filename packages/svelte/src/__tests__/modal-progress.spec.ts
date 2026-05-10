import type * as srk from '@algoux/standard-ranklist';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  Modal,
  ProgressBar,
} from '../index';
import ModalHost from './ModalHost.svelte';
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

const svelteModalAdapter: ModalComponentAdapter = {
  target: 'Svelte',
  renderModal(options: ModalRenderOptions = {}) {
    const closeEvents: string[] = [];
    let modalOptions: ModalRenderOptions = { ...options };
    const rendered = render(ModalHost, {
      props: {
        open: modalOptions.open ?? true,
        title: modalOptions.title ?? 'Standalone Modal',
        body: modalOptions.body ?? 'Modal body',
        width: modalOptions.width,
        rootClassName: modalOptions.rootClassName,
        wrapClassName: modalOptions.wrapClassName,
        style: modalOptions.style || {},
        closeOnEsc: modalOptions.closeOnEsc,
        closeOnMaskClick: modalOptions.closeOnMaskClick,
      },
    });
    rendered.component.$on('close', (event) => closeEvents.push(event.detail));

    return {
      container: rendered.container,
      cleanup: () => rendered.unmount(),
      update: async (nextOptions) => {
        modalOptions = { ...modalOptions, ...nextOptions };
        rendered.component.$set({
          open: modalOptions.open ?? true,
          title: modalOptions.title ?? 'Standalone Modal',
          body: modalOptions.body ?? 'Modal body',
          width: modalOptions.width,
          rootClassName: modalOptions.rootClassName,
          wrapClassName: modalOptions.wrapClassName,
          style: modalOptions.style || {},
          closeOnEsc: modalOptions.closeOnEsc,
          closeOnMaskClick: modalOptions.closeOnMaskClick,
        });
        await tick();
      },
      getCloseReasons: () => closeEvents,
      clickCloseButton: () => fireEvent.click(rendered.container.querySelector('button[aria-label="Close"]')!),
      triggerMaskMouseDown: () => fireEvent.mouseDown(rendered.container.querySelector('.srk-modal-wrap')!),
      triggerEscape: () => fireEvent.keyDown(document, { key: 'Escape' }),
    };
  },
  renderDefaultUserModal() {
    const ranklist = makeRanklist();
    const rendered = render(DefaultUserModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
        formatSrkAssetUrl: (url: string, field: string) => `proxied:${field}:${url}`,
      },
    });

    return {
      container: rendered.container,
      cleanup: () => rendered.unmount(),
      getPhotoSrc: () =>
        (rendered.container.querySelector('img[alt="User portrait"]') as HTMLImageElement | null)?.getAttribute('src') || null,
    };
  },
  renderDefaultSolutionModal() {
    const ranklist = makeRanklist();
    const rendered = render(DefaultSolutionModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        problem: ranklist.problems[0],
        problemIndex: 0,
        solutions: [...(ranklist.rows[0].statuses[0].solutions || [])].reverse(),
      },
    });

    return {
      container: rendered.container,
      cleanup: () => rendered.unmount(),
    };
  },
};

describeModalComponentContract(svelteModalAdapter);
describeDefaultModalContentContract(svelteModalAdapter);

const svelteAnimatedModalAdapter: AnimatedModalAdapter = {
  target: 'Svelte',
  renderInteractiveModal(options = {}) {
    const modalProps = {
      open: options.open ?? true,
      title: options.title ?? 'Standalone Modal',
      body: options.body ?? 'Modal body',
      width: options.width,
      ...(options.destroyOnClose !== undefined ? { destroyOnClose: options.destroyOnClose } : {}),
    };
    const rendered = render(ModalHost, {
      props: modalProps,
    });

    return {
      container: rendered.container,
      cleanup: () => rendered.unmount(),
      update: async (nextOptions) => {
        rendered.component.$set({
          open: nextOptions.open ?? true,
          title: nextOptions.title ?? 'Standalone Modal',
          body: nextOptions.body ?? 'Modal body',
          width: nextOptions.width,
          ...(nextOptions.destroyOnClose !== undefined ? { destroyOnClose: nextOptions.destroyOnClose } : {}),
        });
        await tick();
        await tick();
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await tick();
        await tick();
      },
    };
  },
  renderInteractiveDefaultUserModal() {
    const ranklist = makeRanklist();
    const rendered = render(DefaultUserModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
      },
    });

    return {
      container: rendered.container,
      cleanup: () => rendered.unmount(),
      closeAndClearUser: async () => {
        rendered.component.$set({
          open: false,
          user: null,
        });
        await tick();
        await tick();
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await tick();
        await tick();
      },
    };
  },
};

describeAnimatedModalInteractionContract(svelteAnimatedModalAdapter);

describe('Svelte modal and progress components', () => {
  afterEach(() => {
    cleanup();
    document.body.className = '';
    document.body.removeAttribute('style');
  });

  it('reopens the default user modal after it has fully closed', async () => {
    vi.useFakeTimers();
    const ranklist = makeRanklist();
    const rendered = render(DefaultUserModal, {
      props: {
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
      },
    });

    try {
      rendered.component.$set({
        open: false,
        user: null,
      });
      await tick();
      await tick();

      vi.advanceTimersByTime(281);
      await tick();
      await tick();

      expect(rendered.container.querySelector('.srk-animated-modal-root')).toBeNull();

      rendered.component.$set({
        open: true,
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
      });
      await tick();
      await tick();

      const root = rendered.container.querySelector('.srk-animated-modal-root');
      expect(root).not.toBeNull();
      expect(['pre-open', 'opening']).toContain(root?.getAttribute('data-srk-modal-state'));
    } finally {
      vi.useRealTimers();
      rendered.unmount();
    }
  });

  it('uses the latest click point across repeated full reopen cycles', async () => {
    vi.useFakeTimers();
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

    const rendered = render(ModalHost, {
      props: {
        open: false,
        destroyOnClose: true,
      },
    });

    try {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 60, clientY: 40 }));
      rendered.component.$set({ open: true });
      await tick();
      await tick();
      vi.advanceTimersByTime(16);
      await tick();
      await tick();
      vi.advanceTimersByTime(0);
      await tick();

      let dialog = rendered.container.querySelector('.srk-modal') as HTMLElement | null;
      expect(dialog?.style.getPropertyValue('--srk-modal-origin-x')).toBe('-140px');
      expect(dialog?.style.getPropertyValue('--srk-modal-origin-y')).toBe('-60px');

      rendered.component.$set({ open: false });
      await tick();
      await tick();
      vi.advanceTimersByTime(281);
      await tick();
      await tick();

      expect(rendered.container.querySelector('.srk-animated-modal-root')).toBeNull();

      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 320, clientY: 220 }));
      rendered.component.$set({ open: true });
      await tick();
      await tick();
      vi.advanceTimersByTime(16);
      await tick();
      await tick();
      vi.advanceTimersByTime(0);
      await tick();

      dialog = rendered.container.querySelector('.srk-modal') as HTMLElement | null;
      expect(dialog?.style.getPropertyValue('--srk-modal-origin-x')).toBe('120px');
      expect(dialog?.style.getPropertyValue('--srk-modal-origin-y')).toBe('120px');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      vi.useRealTimers();
      rendered.unmount();
    }
  });

  it('dispatches timeTravel from the internal range input', async () => {
    const events: Array<number | null> = [];
    const { component, container } = render(ProgressBar, {
      props: {
        data: makeLocalRanklist(),
        enableTimeTravel: true,
      },
    });
    component.$on('timeTravel', (event) => events.push(event.detail));

    await tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
    await waitFor(() => expect(container.querySelector('input[type="range"]')).not.toBeNull());
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.mouseDown(slider);
    slider.value = '120';
    await fireEvent.input(slider);
    await fireEvent.mouseUp(slider);

    expect(events[0]).toBe(120 * 60 * 1000);
  });
});
