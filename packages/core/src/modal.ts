export const MODAL_ANIMATION_DURATION_MS = 280;
export const SRK_ANIMATED_MODAL_ROOT_CLASS = 'srk-animated-modal-root';
export const SRK_SCROLL_LOCK_BODY_CLASS = 'srk-scrolling-effect';

export interface InteractionPoint {
  x: number;
  y: number;
}

export interface ModalTriggerPoint extends InteractionPoint {
  timestamp: number;
  source?: string;
  context?: Record<string, unknown>;
}

export type TransformOriginResolution = {
  origin: InteractionPoint;
  source: 'explicit-trigger' | 'global-pointer' | 'fallback';
  explicitTriggerPoint: ModalTriggerPoint | null;
  globalInteractionPoint: InteractionPoint | null;
  dialogRect: { left: number; top: number; width: number; height: number } | null;
  fallbackPoint: InteractionPoint;
};

export type ModalFocusScopeId = number;

export interface ModalFocusScopeOptions {
  onEscape?: (event: KeyboardEvent) => void;
}

interface ModalFocusScope {
  id: ModalFocusScopeId;
  dialogElement: HTMLElement;
  restoreElement: HTMLElement | null;
  hadTabIndex: boolean;
  previousTabIndex: string | null;
  onEscape?: (event: KeyboardEvent) => void;
}

let lastExplicitTriggerPoint: ModalTriggerPoint | null = null;
let lastInteractionPoint: InteractionPoint | null = null;
let hasInteractionTracker = false;
let lockedModalCount = 0;
let previousBodyOverflow = '';
let previousBodyOverflowX = '';
let previousBodyOverflowY = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyLeft = '';
let previousBodyRight = '';
let previousBodyWidth = '';
let previousScrollX = 0;
let previousScrollY = 0;
let nextModalFocusScopeId = 1;
let modalFocusStack: ModalFocusScope[] = [];
let hasModalFocusEscapeListener = false;

function handleModalFocusKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') {
    return;
  }

  const topScope = modalFocusStack[modalFocusStack.length - 1];
  if (!topScope) {
    return;
  }

  topScope.onEscape?.(event);
  event.stopImmediatePropagation?.();
  event.stopPropagation();
}

function ensureModalFocusEscapeListener() {
  if (typeof document === 'undefined' || hasModalFocusEscapeListener) {
    return;
  }

  document.addEventListener('keydown', handleModalFocusKeyDown);
  hasModalFocusEscapeListener = true;
}

export function ensureModalInteractionTracker() {
  if (typeof document === 'undefined' || hasInteractionTracker) {
    return;
  }

  document.addEventListener(
    'mousedown',
    (event) => {
      lastInteractionPoint = { x: event.clientX, y: event.clientY };
    },
    true,
  );

  document.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) {
        return;
      }
      lastInteractionPoint = { x: touch.clientX, y: touch.clientY };
    },
    { capture: true, passive: true },
  );

  hasInteractionTracker = true;
}

export function setModalTriggerPoint(
  x: number,
  y: number,
  options?: {
    source?: string;
    context?: Record<string, unknown>;
  },
) {
  lastExplicitTriggerPoint = {
    x,
    y,
    timestamp: Date.now(),
    source: options?.source,
    context: options?.context,
  };
}

export function captureModalTriggerPointFromMouseEvent(
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  options?: {
    source?: string;
    context?: Record<string, unknown>;
  },
) {
  setModalTriggerPoint(event.clientX, event.clientY, options);
}

export function getRecentModalTriggerPoint(maxAgeMs = 500): ModalTriggerPoint | null {
  if (!lastExplicitTriggerPoint) {
    return null;
  }

  if (Date.now() - lastExplicitTriggerPoint.timestamp > maxAgeMs) {
    return null;
  }

  return lastExplicitTriggerPoint;
}

export function getLastModalInteractionPoint() {
  return lastInteractionPoint;
}

export function resolveModalTransformOrigin(dialogElement: HTMLElement | null): TransformOriginResolution {
  if (typeof window === 'undefined' || !dialogElement) {
    return {
      origin: { x: 0, y: 0 },
      source: 'fallback',
      explicitTriggerPoint: null,
      globalInteractionPoint: lastInteractionPoint,
      dialogRect: null,
      fallbackPoint: { x: 0, y: 0 },
    };
  }

  const rect = dialogElement.getBoundingClientRect();
  const fallbackPoint = {
    x: rect.width / 2,
    y: Math.min(rect.height * 0.22, 96),
  };

  const explicitTriggerPoint = getRecentModalTriggerPoint();
  if (explicitTriggerPoint) {
    return {
      origin: {
        x: explicitTriggerPoint.x - rect.left,
        y: explicitTriggerPoint.y - rect.top,
      },
      source: 'explicit-trigger',
      explicitTriggerPoint,
      globalInteractionPoint: lastInteractionPoint,
      dialogRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      fallbackPoint,
    };
  }

  if (!lastInteractionPoint) {
    return {
      origin: fallbackPoint,
      source: 'fallback',
      explicitTriggerPoint: null,
      globalInteractionPoint: null,
      dialogRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      fallbackPoint,
    };
  }

  return {
    origin: {
      x: lastInteractionPoint.x - rect.left,
      y: lastInteractionPoint.y - rect.top,
    },
    source: 'global-pointer',
    explicitTriggerPoint: null,
    globalInteractionPoint: lastInteractionPoint,
    dialogRect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    fallbackPoint,
  };
}

function activeHTMLElement(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function focusWithoutScroll(element: HTMLElement) {
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function registerModalFocusScope(
  dialogElement: HTMLElement | null,
  options: ModalFocusScopeOptions = {},
): ModalFocusScopeId | null {
  if (typeof document === 'undefined' || !dialogElement) {
    return null;
  }

  ensureModalFocusEscapeListener();

  const existing = modalFocusStack.find((entry) => entry.dialogElement === dialogElement);
  if (existing) {
    existing.onEscape = options.onEscape;
    return existing.id;
  }

  const hadTabIndex = dialogElement.hasAttribute('tabindex');
  const previousTabIndex = dialogElement.getAttribute('tabindex');
  if (!hadTabIndex) {
    dialogElement.setAttribute('tabindex', '-1');
  }

  const scope: ModalFocusScope = {
    id: nextModalFocusScopeId,
    dialogElement,
    restoreElement: activeHTMLElement(),
    hadTabIndex,
    previousTabIndex,
    onEscape: options.onEscape,
  };
  nextModalFocusScopeId += 1;
  modalFocusStack.push(scope);
  focusWithoutScroll(dialogElement);

  return scope.id;
}

export function unregisterModalFocusScope(scopeId: ModalFocusScopeId | null | undefined) {
  if (typeof document === 'undefined' || scopeId == null) {
    return;
  }

  const index = modalFocusStack.findIndex((entry) => entry.id === scopeId);
  if (index === -1) {
    return;
  }

  const [scope] = modalFocusStack.splice(index, 1);
  if (scope.hadTabIndex) {
    if (scope.previousTabIndex === null) {
      scope.dialogElement.removeAttribute('tabindex');
    } else {
      scope.dialogElement.setAttribute('tabindex', scope.previousTabIndex);
    }
  } else {
    scope.dialogElement.removeAttribute('tabindex');
  }

  const wasTopScope = index === modalFocusStack.length;
  if (!wasTopScope) {
    return;
  }

  const nextTopScope = modalFocusStack[modalFocusStack.length - 1];
  const restoreElement = scope.restoreElement?.isConnected ? scope.restoreElement : nextTopScope?.dialogElement;
  if (restoreElement) {
    focusWithoutScroll(restoreElement);
  }
}

export function isTopModalFocusScope(scopeId: ModalFocusScopeId | null | undefined) {
  if (scopeId == null) {
    return false;
  }
  return modalFocusStack[modalFocusStack.length - 1]?.id === scopeId;
}

export function lockModalBodyScroll() {
  if (typeof document === 'undefined') {
    return;
  }
  if (lockedModalCount === 0) {
    previousScrollX = window.scrollX;
    previousScrollY = window.scrollY;
    previousBodyOverflow = document.body.style.overflow;
    previousBodyOverflowX = document.body.style.overflowX;
    previousBodyOverflowY = document.body.style.overflowY;
    previousBodyPosition = document.body.style.position;
    previousBodyTop = document.body.style.top;
    previousBodyLeft = document.body.style.left;
    previousBodyRight = document.body.style.right;
    previousBodyWidth = document.body.style.width;
    document.body.classList.add(SRK_SCROLL_LOCK_BODY_CLASS);
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${previousScrollY}px`;
    document.body.style.left = `-${previousScrollX}px`;
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  lockedModalCount += 1;
}

export function unlockModalBodyScroll() {
  if (typeof document === 'undefined' || lockedModalCount === 0) {
    return;
  }
  lockedModalCount -= 1;
  if (lockedModalCount === 0) {
    document.body.classList.remove(SRK_SCROLL_LOCK_BODY_CLASS);
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.overflowX = previousBodyOverflowX;
    document.body.style.overflowY = previousBodyOverflowY;
    document.body.style.position = previousBodyPosition;
    document.body.style.top = previousBodyTop;
    document.body.style.left = previousBodyLeft;
    document.body.style.right = previousBodyRight;
    document.body.style.width = previousBodyWidth;
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (!isJsdom && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo(previousScrollX, previousScrollY);
      } catch {
        // jsdom exposes scrollTo but leaves it unimplemented.
      }
    }
  }
}

export function resetModalInteractionStateForTests() {
  lastExplicitTriggerPoint = null;
  lastInteractionPoint = null;
  lockedModalCount = 0;
  nextModalFocusScopeId = 1;
  modalFocusStack = [];
  previousBodyOverflow = '';
  previousBodyOverflowX = '';
  previousBodyOverflowY = '';
  previousBodyPosition = '';
  previousBodyTop = '';
  previousBodyLeft = '';
  previousBodyRight = '';
  previousBodyWidth = '';
  previousScrollX = 0;
  previousScrollY = 0;

  if (typeof document !== 'undefined') {
    document.body.classList.remove(SRK_SCROLL_LOCK_BODY_CLASS);
    document.body.style.overflow = '';
    document.body.style.overflowX = '';
    document.body.style.overflowY = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
  }
}
