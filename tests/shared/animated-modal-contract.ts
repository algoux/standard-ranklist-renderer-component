import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireElement } from './ranklist-dom-assertions';

export interface AnimatedModalRenderOptions {
  open?: boolean;
  title?: string;
  body?: string;
  width?: number;
  destroyOnClose?: boolean;
}

export interface InteractiveModalHarness {
  container: ParentNode;
  cleanup?: () => void | Promise<void>;
  update: (options: AnimatedModalRenderOptions) => void | Promise<void>;
  advanceTime: (ms: number) => void | Promise<void>;
}

export interface InteractiveDefaultUserModalHarness {
  container: ParentNode;
  cleanup?: () => void | Promise<void>;
  closeAndClearUser: () => void | Promise<void>;
  advanceTime: (ms: number) => void | Promise<void>;
}

export interface AnimatedModalAdapter {
  target: string;
  renderInteractiveModal: (options?: AnimatedModalRenderOptions) => InteractiveModalHarness | Promise<InteractiveModalHarness>;
  renderInteractiveDefaultUserModal: () => InteractiveDefaultUserModalHarness | Promise<InteractiveDefaultUserModalHarness>;
}

function documentBodyFor(container: ParentNode) {
  return (container as Element).ownerDocument?.body || document.body;
}

export function describeAnimatedModalInteractionContract(adapter: AnimatedModalAdapter) {
  describe(`${adapter.target} animated modal interaction contract`, () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.className = '';
      document.body.removeAttribute('style');
    });

    it('locks background scrolling while open and restores it after the close animation', async () => {
      vi.useFakeTimers();

      const rendered = await adapter.renderInteractiveModal({
        open: true,
        title: 'Standalone Modal',
        body: 'Modal body',
      });

      try {
        const body = documentBodyFor(rendered.container);

        expect(body.style.overflow).toBe('hidden');
        expect(body.style.position).toBe('fixed');
        expect(body.style.width).toBe('100%');

        await rendered.update({
          open: false,
          title: 'Standalone Modal',
          body: 'Modal body',
        });
        await rendered.advanceTime(0);

        expect(rendered.container.querySelector('.srk-animated-modal-root')).toBeTruthy();

        await rendered.advanceTime(281);

        expect(body.style.overflow).toBe('');
        expect(body.style.position).toBe('');
        expect(body.style.width).toBe('');
        expect(rendered.container.querySelector('.srk-animated-modal-root')).toBeFalsy();
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('moves focus into the dialog while open and restores previous focus on close', async () => {
      vi.useFakeTimers();
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.textContent = 'Open modal';
      document.body.appendChild(trigger);
      trigger.focus();

      const rendered = await adapter.renderInteractiveModal({
        open: true,
        title: 'Standalone Modal',
        body: 'Modal body',
      });

      try {
        await rendered.advanceTime(0);
        const dialog = requireElement<HTMLElement>(rendered.container, '.srk-modal');

        expect(dialog.getAttribute('tabindex')).toBe('-1');
        expect(dialog.contains(document.activeElement) || document.activeElement === dialog).toBe(true);

        await rendered.update({
          open: false,
          title: 'Standalone Modal',
          body: 'Modal body',
        });
        await rendered.advanceTime(0);

        expect(document.activeElement).toBe(trigger);
      } finally {
        await rendered.cleanup?.();
        trigger.remove();
      }
    });

    it('keeps the default user modal mounted long enough to play the close animation', async () => {
      vi.useFakeTimers();

      const rendered = await adapter.renderInteractiveDefaultUserModal();

      try {
        await rendered.closeAndClearUser();
        await rendered.advanceTime(0);

        const root = rendered.container.querySelector('.srk-animated-modal-root') as HTMLElement | null;
        expect(root?.getAttribute('data-srk-modal-state')).toBe('closing');

        await rendered.advanceTime(281);

        expect(rendered.container.querySelector('.srk-animated-modal-root')).toBeNull();
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('applies the shared motion shell contract', async () => {
      vi.useFakeTimers();

      const rendered = await adapter.renderInteractiveModal({
        open: false,
        title: 'Standalone Modal',
        body: 'Modal body',
        width: 420,
        destroyOnClose: false,
      });

      try {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 80 }));

        await rendered.update({
          open: true,
          title: 'Standalone Modal',
          body: 'Modal body',
          width: 420,
          destroyOnClose: false,
        });

        await rendered.advanceTime(0);
        await rendered.advanceTime(16);

        const root = requireElement<HTMLElement>(rendered.container, '.srk-animated-modal-root');
        const dialog = requireElement<HTMLElement>(rendered.container, '.srk-modal');

        expect(['pre-open', 'opening']).toContain(root.getAttribute('data-srk-modal-state'));
        expect(dialog.style.getPropertyValue('--srk-modal-max-width')).toBe('420px');
        expect(dialog.style.getPropertyValue('--srk-modal-origin-x')).toBeTruthy();
        expect(dialog.style.getPropertyValue('--srk-modal-origin-y')).toBeTruthy();
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('keeps the transform origin anchored to the raw click point even when it falls outside the modal box', async () => {
      vi.useFakeTimers();

      const rendered = await adapter.renderInteractiveModal({
        open: false,
        title: 'Standalone Modal',
        body: 'Modal body',
        destroyOnClose: false,
      });

      try {
        const dialog = requireElement<HTMLDivElement>(rendered.container, '.srk-modal');
        dialog.getBoundingClientRect = () => ({
          x: 200,
          y: 100,
          left: 200,
          top: 100,
          right: 620,
          bottom: 340,
          width: 420,
          height: 240,
          toJSON: () => ({}),
        }) as DOMRect;

        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 60, clientY: 40 }));

        await rendered.update({
          open: true,
          title: 'Standalone Modal',
          body: 'Modal body',
          destroyOnClose: false,
        });

        await rendered.advanceTime(0);
        await rendered.advanceTime(16);

        expect(dialog.style.getPropertyValue('--srk-modal-origin-x')).toBe('-140px');
        expect(dialog.style.getPropertyValue('--srk-modal-origin-y')).toBe('-60px');
      } finally {
        await rendered.cleanup?.();
      }
    });
  });
}
