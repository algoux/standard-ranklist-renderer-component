import type * as srk from '@algoux/standard-ranklist';
import { describe, expect, it } from 'vitest';
import basicRanklistJson from '../fixtures/basic-ranklist.json';
import { makeI18nRanklist } from './ranklist-i18n-fixtures';
import { expectTextIncludes, requireElement, textOf } from './ranklist-dom-assertions';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function makeRanklist(): srk.Ranklist {
  return clone(basicRanklistJson as srk.Ranklist);
}

export interface ModalRenderOptions {
  open?: boolean;
  title?: string;
  body?: string;
  width?: number;
  rootClassName?: string;
  wrapClassName?: string;
  style?: Record<string, string>;
  closeOnEsc?: boolean;
  closeOnMaskClick?: boolean;
}

export interface RenderedModalHarness {
  container: ParentNode;
  cleanup?: () => void | Promise<void>;
  update: (options: ModalRenderOptions) => void | Promise<void>;
  getCloseReasons: () => string[];
  clickCloseButton: () => void | Promise<void>;
  triggerMaskMouseDown: () => void | Promise<void>;
  triggerEscape: () => void | Promise<void>;
}

export interface RenderedDefaultUserModalHarness {
  container: ParentNode;
  cleanup?: () => void | Promise<void>;
  getPhotoSrc: () => string | null;
}

export interface RenderedDefaultSolutionModalHarness {
  container: ParentNode;
  cleanup?: () => void | Promise<void>;
}

export interface DefaultUserModalRenderOptions {
  user?: srk.User;
  markers?: srk.Marker[];
  languages?: readonly string[];
}

export interface DefaultSolutionModalRenderOptions {
  user?: srk.User;
  problem?: srk.Problem;
  problemIndex?: number;
  solutions?: srk.Solution[];
  languages?: readonly string[];
}

export interface ModalComponentAdapter {
  target: string;
  renderModal: (options?: ModalRenderOptions) => RenderedModalHarness | Promise<RenderedModalHarness>;
  renderDefaultUserModal: (
    options?: DefaultUserModalRenderOptions,
  ) => RenderedDefaultUserModalHarness | Promise<RenderedDefaultUserModalHarness>;
  renderDefaultSolutionModal: (
    options?: DefaultSolutionModalRenderOptions,
  ) => RenderedDefaultSolutionModalHarness | Promise<RenderedDefaultSolutionModalHarness>;
}

export function describeModalComponentContract(adapter: ModalComponentAdapter) {
  describe(`${adapter.target} modal component contract`, () => {
    it('renders the modal shell with forwarded width, classes, and styles', async () => {
      const rendered = await adapter.renderModal({
        open: true,
        title: 'Standalone Modal',
        body: 'Modal body',
        width: 360,
        rootClassName: 'contract-root',
        wrapClassName: 'contract-wrap',
        style: {
          'max-width': '530px',
        },
      });

      try {
        const root = requireElement<HTMLElement>(rendered.container, '.srk-modal-root.contract-root');
        const wrap = requireElement<HTMLElement>(rendered.container, '.srk-modal-wrap.contract-wrap');
        const dialog = requireElement<HTMLElement>(rendered.container, '.srk-modal');
        const closeButton = requireElement<HTMLButtonElement>(rendered.container, 'button[aria-label="Close"]');

        expect(root).toBeTruthy();
        expect(wrap).toBeTruthy();
        expect(dialog.getAttribute('role')).toBe('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.style.width).toBe('360px');
        expect(dialog.style.maxWidth).toBe('530px');
        expect(closeButton.className).toContain('srk-modal-close');
        expectTextIncludes(rendered.container as Element, 'Standalone Modal');
        expectTextIncludes(rendered.container as Element, 'Modal body');
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('does not render the modal shell while closed', async () => {
      const rendered = await adapter.renderModal({
        open: false,
        title: 'Closed Modal',
        body: 'Hidden body',
      });

      try {
        expect(rendered.container.querySelector('.srk-modal-root')).toBeNull();
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('emits close-button reason from the close control', async () => {
      const rendered = await adapter.renderModal();

      try {
        await rendered.clickCloseButton();
        expect(rendered.getCloseReasons()).toEqual(['close-button']);
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('emits mask and escape reasons from modal dismissal interactions', async () => {
      const rendered = await adapter.renderModal();

      try {
        await rendered.triggerMaskMouseDown();
        await rendered.triggerEscape();
        expect(rendered.getCloseReasons()).toEqual(['mask', 'escape']);
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('respects disabled mask and escape dismissal props', async () => {
      const rendered = await adapter.renderModal({
        closeOnEsc: false,
        closeOnMaskClick: false,
      });

      try {
        await rendered.triggerMaskMouseDown();
        await rendered.triggerEscape();
        expect(rendered.getCloseReasons()).toEqual([]);
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('honors closeOnEsc when it is enabled after opening', async () => {
      const rendered = await adapter.renderModal({
        closeOnEsc: false,
      });

      try {
        await rendered.triggerEscape();
        expect(rendered.getCloseReasons()).toEqual([]);

        await rendered.update({
          closeOnEsc: true,
        });
        await rendered.triggerEscape();
        expect(rendered.getCloseReasons()).toEqual(['escape']);
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('only lets the topmost modal handle Escape', async () => {
      const outer = await adapter.renderModal({
        title: 'Outer Modal',
        body: 'Outer body',
      });
      const inner = await adapter.renderModal({
        title: 'Inner Modal',
        body: 'Inner body',
      });

      try {
        await inner.triggerEscape();

        expect(inner.getCloseReasons()).toEqual(['escape']);
        expect(outer.getCloseReasons()).toEqual([]);
      } finally {
        await inner.cleanup?.();
        await outer.cleanup?.();
      }
    });
  });
}

export function describeDefaultModalContentContract(adapter: ModalComponentAdapter) {
  describe(`${adapter.target} default modal content contract`, () => {
    it('renders the default user modal content and width contract', async () => {
      const rendered = await adapter.renderDefaultUserModal();

      try {
        const dialog = requireElement<HTMLElement>(rendered.container, '.srk-modal');
        expect(textOf(rendered.container as Element)).toContain('User Info');
        expect(textOf(rendered.container as Element)).toContain('Team Alpha');
        expect(textOf(rendered.container as Element)).toContain('Alpha University');
        expect(textOf(rendered.container as Element)).toContain('Alice');
        expect(textOf(rendered.container as Element)).toContain('Bob');
        expect(dialog.style.width).toBe('420px');
        expect(rendered.getPhotoSrc()).toBe('proxied:user.photo:https://cdn.example.com/photo.png');
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('renders team member roles when they are provided', async () => {
      const ranklist = makeRanklist();
      const user: srk.User = {
        ...ranklist.rows[0].user,
        teamMembers: [
          { name: 'Alice', role: 'Captain' },
          { name: 'Bob' },
        ],
      };
      const rendered = await adapter.renderDefaultUserModal({ user });

      try {
        const text = textOf(rendered.container as Element);
        expect(text).toContain('Alice (Captain)');
        expect(text).toContain('Bob');
        expect(text).not.toContain('Bob (');
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('renders the default solution modal content and width contract', async () => {
      const rendered = await adapter.renderDefaultSolutionModal();

      try {
        const dialog = requireElement<HTMLElement>(rendered.container, '.srk-modal');
        expect(textOf(rendered.container as Element)).toContain('Solutions of A (Team Alpha)');
        expect(textOf(rendered.container as Element)).toContain('Accepted');
        expect(textOf(rendered.container as Element)).toContain('Wrong Answer');
        expect(dialog.style.width).toBe('320px');
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('uses explicit languages in default user modal text', async () => {
      const ranklist = makeI18nRanklist();
      const rendered = await adapter.renderDefaultUserModal({
        user: ranklist.rows[0].user,
        markers: ranklist.markers,
        languages: ['zh-CN'],
      });

      try {
        expect(textOf(rendered.container as Element)).toContain('中文队伍');
        expect(textOf(rendered.container as Element)).toContain('中文大学');
        expect(textOf(rendered.container as Element)).toContain('中文队员');
        expect(textOf(rendered.container as Element)).toContain('中文标记');
        expect(textOf(rendered.container as Element)).not.toContain('English Team');
      } finally {
        await rendered.cleanup?.();
      }
    });

    it('uses explicit languages in default solution modal title text', async () => {
      const ranklist = makeI18nRanklist();
      const rendered = await adapter.renderDefaultSolutionModal({
        user: ranklist.rows[0].user,
        problem: ranklist.problems[0],
        problemIndex: 0,
        solutions: [],
        languages: ['zh-CN'],
      });

      try {
        expect(textOf(rendered.container as Element)).toContain('Solutions of A (中文队伍)');
        expect(textOf(rendered.container as Element)).not.toContain('English Team');
      } finally {
        await rendered.cleanup?.();
      }
    });
  });
}
