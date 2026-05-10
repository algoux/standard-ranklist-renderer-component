import type { JSX } from 'solid-js';
import { createEffect, createMemo, createSignal, createUniqueId, on, onCleanup, onMount, Show, untrack } from 'solid-js';
import {
  MODAL_ANIMATION_DURATION_MS,
  SRK_ANIMATED_MODAL_ROOT_CLASS,
  ensureModalInteractionTracker,
  lockModalBodyScroll,
  registerModalFocusScope,
  resolveModalTransformOrigin,
  unlockModalBodyScroll,
  unregisterModalFocusScope,
} from '@algoux/standard-ranklist-renderer-component-core';

export type ModalCloseReason = 'mask' | 'close-button' | 'escape';

export interface ModalProps {
  open: boolean;
  title?: JSX.Element;
  children?: JSX.Element;
  width?: number;
  rootClassName?: string;
  wrapClassName?: string;
  style?: JSX.CSSProperties;
  destroyOnClose?: boolean;
  closeOnEsc?: boolean;
  closeOnMaskClick?: boolean;
  onClose?: (event: MouseEvent | KeyboardEvent, reason: ModalCloseReason) => void;
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Modal(props: ModalProps) {
  const titleId = createUniqueId();
  const destroyOnClose = () => props.destroyOnClose ?? true;
  const closeOnEsc = () => props.closeOnEsc ?? true;
  const closeOnMaskClick = () => props.closeOnMaskClick ?? true;
  const [isMounted, setIsMounted] = createSignal(props.open || !destroyOnClose());
  const [animationState, setAnimationState] = createSignal<'pre-open' | 'opening' | 'closing'>(
    props.open ? 'pre-open' : 'closing',
  );
  const [transformOrigin, setTransformOrigin] = createSignal({ x: 0, y: 0 });
  let rootRef: HTMLDivElement | undefined;
  let dialogRef: HTMLDivElement | undefined;
  let closeTimer: number | null = null;
  let openTimer: number | null = null;
  let bodyLocked = false;
  let focusScopeId: number | null = null;
  let pendingFocusRegistration = false;
  const shouldRender = createMemo(() => props.open || isMounted() || !destroyOnClose());
  const shouldLockBody = createMemo(() => props.open || (destroyOnClose() && isMounted()));
  const rootClassName = createMemo(() => classNames('srk-modal-root', SRK_ANIMATED_MODAL_ROOT_CLASS, props.rootClassName));
  const baseDialogStyle = createMemo<JSX.CSSProperties>(() => ({
    ...props.style,
    width: props.width ? `${props.width}px` : props.style?.width,
    maxWidth: props.style?.maxWidth,
  }));

  const clearTimers = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (openTimer !== null) {
      window.clearTimeout(openTimer);
      openTimer = null;
    }
  };

  function handleEscape(event: KeyboardEvent) {
    if (props.open && closeOnEsc()) {
      props.onClose?.(event, 'escape');
    }
  }

  const registerFocusScope = () => {
    if (!props.open || !dialogRef || focusScopeId !== null) {
      return;
    }

    if (!dialogRef.isConnected) {
      if (!pendingFocusRegistration) {
        pendingFocusRegistration = true;
        queueMicrotask(() => {
          pendingFocusRegistration = false;
          registerFocusScope();
        });
      }
      return;
    }

    focusScopeId = registerModalFocusScope(dialogRef, {
      onEscape: handleEscape,
    });
  };

  onMount(() => {
    registerFocusScope();
  });

  createEffect(() => {
    ensureModalInteractionTracker();
  });

  onCleanup(() => {
    clearTimers();
    unregisterModalFocusScope(focusScopeId);
    focusScopeId = null;
  });

  createEffect(
    on(
      () => props.open,
      (open) => {
        const destroy = destroyOnClose();

        clearTimers();

        if (open) {
          setIsMounted(true);
          setTransformOrigin({ x: 0, y: 0 });
          setAnimationState('pre-open');

          if (typeof window !== 'undefined') {
            openTimer = window.setTimeout(() => {
              if (!props.open || animationState() !== 'pre-open') {
                openTimer = null;
                return;
              }
              const resolution = resolveModalTransformOrigin(dialogRef || null);
              setTransformOrigin(resolution.origin);
              setAnimationState('opening');
              openTimer = null;
            }, 0);
          }
          return;
        }

        if (focusScopeId !== null) {
          unregisterModalFocusScope(focusScopeId);
          focusScopeId = null;
        }
        setAnimationState('closing');
        if (!destroy) {
          setIsMounted(true);
          return;
        }

        if (untrack(isMounted) && typeof window !== 'undefined') {
          closeTimer = window.setTimeout(() => {
            if (bodyLocked) {
              unlockModalBodyScroll();
              bodyLocked = false;
            }
            rootRef?.remove();
            setIsMounted(false);
            closeTimer = null;
          }, MODAL_ANIMATION_DURATION_MS);
        }
      },
      { defer: false },
    ),
  );

  createEffect(
    on(
      shouldLockBody,
      (lock) => {
        if (lock && !bodyLocked) {
          lockModalBodyScroll();
          bodyLocked = true;
          return;
        }

        if (!lock && bodyLocked) {
          unlockModalBodyScroll();
          bodyLocked = false;
          return;
        }
      },
      { defer: false },
    ),
  );

  onCleanup(() => {
    if (bodyLocked) {
      unlockModalBodyScroll();
      bodyLocked = false;
    }
    unregisterModalFocusScope(focusScopeId);
    focusScopeId = null;
  });

  createEffect(() => {
    if (props.open && shouldRender()) {
      registerFocusScope();
    }
  });

  createEffect(() => {
    const width = props.width ? `${props.width}px` : typeof props.style?.width === 'string' ? props.style.width : null;
    const originX = `${transformOrigin().x}px`;
    const originY = `${transformOrigin().y}px`;
    const state = animationState();
    const root = rootRef;
    const dialog = dialogRef;

    if (root) {
      root.setAttribute('data-srk-modal-state', state);
    }

    if (!dialog) {
      return;
    }

    if (width) {
      dialog.style.width = width;
      dialog.style.setProperty('--srk-modal-max-width', width);
    } else {
      dialog.style.removeProperty('width');
      dialog.style.removeProperty('--srk-modal-max-width');
    }

    dialog.style.setProperty('--srk-modal-origin-x', originX);
    dialog.style.setProperty('--srk-modal-origin-y', originY);
  });

  const content = () => (
    <div
      class={rootClassName()}
      data-srk-modal-state={animationState()}
      ref={rootRef}
    >
      <div class="srk-modal-mask" />
      <div
        class={classNames('srk-modal-wrap', props.wrapClassName)}
        tabIndex={-1}
        onMouseDown={(event) => {
          if (closeOnMaskClick() && event.target === event.currentTarget) {
            props.onClose?.(event, 'mask');
          }
        }}
      >
        <div
          aria-labelledby={props.title !== undefined ? titleId : undefined}
          aria-modal="true"
          class="srk-modal"
          data-srk-modal-panel="true"
          role="dialog"
          ref={(element) => {
            dialogRef = element;
            registerFocusScope();
          }}
          style={baseDialogStyle()}
          tabIndex={-1}
        >
          <div class="srk-modal-content">
            <button
              aria-label="Close"
              class="srk-modal-close"
              type="button"
              onClick={(event) => props.onClose?.(event, 'close-button')}
            >
              <span class="srk-modal-close-x" />
            </button>
            <Show when={props.title !== undefined}>
              <div class="srk-modal-header">
                <div class="srk-modal-title" id={titleId}>
                  {props.title}
                </div>
              </div>
            </Show>
            <div class="srk-modal-body">{props.children}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return <Show when={shouldRender()}>{content}</Show>;
}
