import classnames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
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

type InteractionPoint = { x: number; y: number };

export interface ModalProps {
  open: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  rootClassName?: string;
  wrapClassName?: string;
  style?: React.CSSProperties;
  destroyOnClose?: boolean;
  closeOnEsc?: boolean;
  closeOnMaskClick?: boolean;
  onClose?: (event: React.SyntheticEvent | Event, reason: ModalCloseReason) => void;
}

let nextModalId = 0;
const useModalLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function Modal({
  open,
  title,
  children,
  width,
  rootClassName,
  wrapClassName,
  style,
  destroyOnClose = true,
  closeOnEsc = true,
  closeOnMaskClick = true,
  onClose,
}: ModalProps) {
  const titleIdRef = React.useRef(`srk-modal-title-${++nextModalId}`);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const openTimerRef = React.useRef<number | null>(null);
  const focusScopeIdRef = React.useRef<number | null>(null);
  const [isMounted, setIsMounted] = React.useState(open || !destroyOnClose);
  const [animationState, setAnimationState] = React.useState<'pre-open' | 'opening' | 'closing'>(
    open ? 'pre-open' : 'closing',
  );
  const [transformOrigin, setTransformOrigin] = React.useState<InteractionPoint>({ x: 0, y: 0 });

  React.useEffect(() => {
    ensureModalInteractionTracker();
  }, []);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }
      unregisterModalFocusScope(focusScopeIdRef.current);
      focusScopeIdRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (open) {
      setIsMounted(true);
      setTransformOrigin({ x: 0, y: 0 });
      setAnimationState('pre-open');
      return;
    }

    setAnimationState('closing');
    if (destroyOnClose && isMounted && typeof window !== 'undefined') {
      closeTimerRef.current = window.setTimeout(() => {
        setIsMounted(false);
      }, MODAL_ANIMATION_DURATION_MS);
    }
  }, [destroyOnClose, isMounted, open]);

  React.useEffect(() => {
    if (!open || !isMounted || animationState !== 'pre-open') {
      return;
    }
    const resolution = resolveModalTransformOrigin(dialogRef.current);
    setTransformOrigin(resolution.origin);
    openTimerRef.current = window.setTimeout(() => {
      setAnimationState('opening');
      openTimerRef.current = null;
    }, 0);

    return () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, [animationState, isMounted, open]);

  const shouldLockBody = open || (destroyOnClose && isMounted);

  React.useEffect(() => {
    if (!shouldLockBody) {
      return;
    }
    lockModalBodyScroll();
    return () => {
      unlockModalBodyScroll();
    };
  }, [shouldLockBody]);

  const handleEscape = React.useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEsc) {
        onClose?.(event, 'escape');
      }
    },
    [closeOnEsc, onClose],
  );

  useModalLayoutEffect(() => {
    if (open && isMounted) {
      focusScopeIdRef.current = registerModalFocusScope(dialogRef.current, {
        onEscape: closeOnEsc ? handleEscape : undefined,
      });
      return;
    }
    if (!open && focusScopeIdRef.current !== null) {
      unregisterModalFocusScope(focusScopeIdRef.current);
      focusScopeIdRef.current = null;
    }
  }, [closeOnEsc, handleEscape, isMounted, open]);

  if (!isMounted && destroyOnClose) {
    return null;
  }

  const dialogStyle: React.CSSProperties = {
    ...style,
    width: width ? `${width}px` : style?.width,
    ['--srk-modal-origin-x' as string]: `${transformOrigin.x}px`,
    ['--srk-modal-origin-y' as string]: `${transformOrigin.y}px`,
    ['--srk-modal-max-width' as string]: width ? `${width}px` : typeof style?.width === 'string' ? style.width : undefined,
  };

  const modalNode = (
    <div
      className={classnames('srk-modal-root', SRK_ANIMATED_MODAL_ROOT_CLASS, 'srk-react-modal-root', rootClassName)}
      data-srk-modal-state={animationState}
    >
      <div className="srk-modal-mask" />
      <div
        className={classnames('srk-modal-wrap', wrapClassName)}
        tabIndex={-1}
        onMouseDown={(event) => {
          if (closeOnMaskClick && event.target === event.currentTarget) {
            onClose?.(event, 'mask');
          }
        }}
      >
        <div
          aria-labelledby={title ? titleIdRef.current : undefined}
          aria-modal="true"
          className="srk-modal"
          data-srk-modal-panel="true"
          ref={dialogRef}
          role="dialog"
          style={dialogStyle}
          tabIndex={-1}
        >
          <div className="srk-modal-content">
            <button
              aria-label="Close"
              className="srk-modal-close"
              type="button"
              onClick={(event) => onClose?.(event, 'close-button')}
            >
              <span className="srk-modal-close-x" />
            </button>
            {title !== undefined && (
              <div className="srk-modal-header">
                <div className="srk-modal-title" id={titleIdRef.current}>
                  {title}
                </div>
              </div>
            )}
            <div className="srk-modal-body">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalNode;
  }

  return ReactDOM.createPortal(modalNode, document.body);
}
