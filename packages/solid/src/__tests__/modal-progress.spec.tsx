import type * as srk from '@algoux/standard-ranklist';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('solid-js/web', async () => {
  const actual = await vi.importActual<typeof import('solid-js/web')>('solid-js/web');
  return {
    ...actual,
    Portal: (props: { children: unknown }) => props.children,
  };
});

import { fireEvent, screen, waitFor } from '@testing-library/dom';
import basicRanklistJson from '../../../../tests/fixtures/basic-ranklist.json';
import { describeAnimatedModalInteractionContract, type AnimatedModalAdapter } from '../../../../tests/shared/animated-modal-contract';
import {
  describeDefaultModalContentContract,
  describeModalComponentContract,
  makeRanklist,
  type ModalComponentAdapter,
  type ModalRenderOptions,
} from '../../../../tests/shared/modal-component-contract';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';

const { createRoot, createSignal } = await import('solid-js');
const { render } = await import('solid-js/web');
const {
  DefaultSolutionModal,
  DefaultUserModal,
  Modal,
  ProgressBar,
} = await import('../index');

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const makeLocalRanklist = (): srk.Ranklist => clone(basicRanklistJson as srk.Ranklist);

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  document.body.removeAttribute('style');
  resetModalInteractionStateForTests();
});

function renderSolid(view: () => Element) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(view, root);
  return {
    root,
    cleanup: () => {
      dispose();
      root.remove();
    },
  };
}

async function flushMicrotasksUntil(check?: () => boolean, attempts = 12) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await Promise.resolve();
    if (!check || check()) {
      return;
    }
  }
}

const solidModalAdapter: ModalComponentAdapter = {
  target: 'Solid',
  renderModal(options: ModalRenderOptions = {}) {
    const closeReasons: string[] = [];
    let updateModal: ((nextOptions: ModalRenderOptions) => void) | undefined;
    const { cleanup } = renderSolid(() => (
      (() => {
        const [modalOptions, setModalOptions] = createSignal<ModalRenderOptions>({ ...options });
        updateModal = (nextOptions) => {
          setModalOptions((previous) => ({ ...previous, ...nextOptions }));
        };

        return (
          <Modal
            open={modalOptions().open ?? true}
            title={modalOptions().title ?? 'Standalone Modal'}
            width={modalOptions().width}
            rootClassName={modalOptions().rootClassName}
            wrapClassName={modalOptions().wrapClassName}
            style={modalOptions().style as never}
            closeOnEsc={modalOptions().closeOnEsc}
            closeOnMaskClick={modalOptions().closeOnMaskClick}
            onClose={(_, reason) => closeReasons.push(reason)}
          >
            <span>{modalOptions().body ?? 'Modal body'}</span>
          </Modal>
        );
      })()
    ));

    return {
      container: document.body,
      cleanup,
      update: async (nextOptions) => {
        updateModal?.(nextOptions);
        await flushMicrotasksUntil();
      },
      getCloseReasons: () => closeReasons,
      clickCloseButton: () => {
        fireEvent.click(screen.getByLabelText('Close'));
      },
      triggerMaskMouseDown: () => {
        fireEvent.mouseDown(document.body.querySelector('.srk-modal-wrap')!);
      },
      triggerEscape: () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      },
    };
  },
  renderDefaultUserModal() {
    const ranklist = makeRanklist();
    const { cleanup } = renderSolid(() => (
      <DefaultUserModal
        open
        user={ranklist.rows[0].user}
        markers={ranklist.markers}
        formatSrkAssetUrl={(url, field) => `proxied:${field}:${url}`}
      />
    ));

    return {
      container: document.body,
      cleanup,
      getPhotoSrc: () =>
        (document.body.querySelector('img[alt="User portrait"]') as HTMLImageElement | null)?.getAttribute('src') || null,
    };
  },
  renderDefaultSolutionModal() {
    const ranklist = makeRanklist();
    const { cleanup } = renderSolid(() => (
      <DefaultSolutionModal
        open
        user={ranklist.rows[0].user}
        problem={ranklist.problems[0]}
        problemIndex={0}
        solutions={[...(ranklist.rows[0].statuses[0].solutions || [])].reverse()}
      />
    ));

    return {
      container: document.body,
      cleanup,
    };
  },
};

describeModalComponentContract(solidModalAdapter);
describeDefaultModalContentContract(solidModalAdapter);

type AnimatedModalOptions = {
  open?: boolean;
  title?: string;
  body?: string;
  width?: number;
  destroyOnClose?: boolean;
};

const solidAnimatedModalAdapter: AnimatedModalAdapter = {
  target: 'Solid',
  renderInteractiveModal(options = {}) {
    const initialOptions: AnimatedModalOptions = {
      open: options.open ?? true,
      title: options.title ?? 'Standalone Modal',
      body: options.body ?? 'Modal body',
      width: options.width,
      destroyOnClose: options.destroyOnClose,
    };
    let updateModal: ((next: AnimatedModalOptions) => void) | undefined;
    let cleanup = () => {};

    createRoot((disposeRoot) => {
      const [modalOptions, setModalOptions] = createSignal(initialOptions);
      updateModal = (next) => {
        setModalOptions((previous) => ({ ...previous, ...next }));
      };

      const { cleanup: cleanupRender } = renderSolid(() => (
        <Modal
          open={modalOptions().open ?? true}
          destroyOnClose={modalOptions().destroyOnClose}
          title={modalOptions().title ?? 'Standalone Modal'}
          width={modalOptions().width}
        >
          <span>{modalOptions().body ?? 'Modal body'}</span>
        </Modal>
      ));

      cleanup = () => {
        cleanupRender();
        disposeRoot();
      };
    });

    return {
      container: document.body,
      cleanup,
      update: async (nextOptions) => {
        updateModal?.(nextOptions);
        await flushMicrotasksUntil(() => {
          const root = document.body.querySelector('.srk-animated-modal-root');
          if (!root) {
            return false;
          }
          if (nextOptions.open === false) {
            return root.getAttribute('data-srk-modal-state') === 'closing';
          }
          return nextOptions.open === true ? root.getAttribute('data-srk-modal-state') !== 'closing' : true;
        });
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await flushMicrotasksUntil(undefined, 16);
      },
    };
  },
  renderInteractiveDefaultUserModal() {
    const ranklist = makeRanklist();
    let closeModal: (() => void) | undefined;
    let cleanup = () => {};

    createRoot((disposeRoot) => {
      const [state, setState] = createSignal<{ open: boolean; user: srk.User | null }>({
        open: true,
        user: ranklist.rows[0].user,
      });

      closeModal = () => {
        setState({
          open: false,
          user: null,
        });
      };

      const { cleanup: cleanupRender } = renderSolid(() => (
        <DefaultUserModal open={state().open} user={state().user} markers={ranklist.markers} />
      ));

      cleanup = () => {
        cleanupRender();
        disposeRoot();
      };
    });

    return {
      container: document.body,
      cleanup,
      closeAndClearUser: async () => {
        closeModal?.();
        await flushMicrotasksUntil(() => {
          return document.body.querySelector('.srk-animated-modal-root')?.getAttribute('data-srk-modal-state') === 'closing';
        });
      },
      advanceTime: async (ms) => {
        vi.advanceTimersByTime(ms);
        await flushMicrotasksUntil(undefined, 16);
      },
    };
  },
};

describeAnimatedModalInteractionContract(solidAnimatedModalAdapter);

describe('Solid modal and progress components', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    document.body.removeAttribute('style');
  });

  it('calls onTimeTravel from the internal range input', async () => {
    const onTimeTravel = vi.fn();
    const { root, cleanup } = renderSolid(() => (
      <ProgressBar data={makeLocalRanklist()} enableTimeTravel onTimeTravel={onTimeTravel} />
    ));

    await waitFor(() => expect(root.querySelector('input[type="range"]')).not.toBeNull());
    const slider = root.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.mouseDown(slider);
    slider.value = '120';
    fireEvent.input(slider);
    fireEvent.mouseUp(slider);

    expect(onTimeTravel).toHaveBeenCalledWith(120 * 60 * 1000);
    expect(root.querySelector('.srk-progress-bar-normal')).not.toBeNull();
    expect(root.querySelector('.srk-progress-bar-frozen')).not.toBeNull();
    cleanup();
  });
});
