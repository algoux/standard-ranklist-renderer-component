<script context="module">
  function toKebabCase(value) {
    return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  function styleObjectToString(value) {
    return Object.entries(value || {})
      .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== '')
      .map(([key, propertyValue]) => `${toKebabCase(key)}: ${propertyValue}`)
      .join('; ');
  }
</script>

<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
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
  import { tick } from 'svelte';

  export let open = false;
  export let title = undefined;
  export let width = undefined;
  export let rootClassName = undefined;
  export let wrapClassName = undefined;
  export let style = {};
  export let destroyOnClose = true;
  export let closeOnEsc = true;
  export let closeOnMaskClick = true;

  const dispatch = createEventDispatcher();
  let dialogElement;
  let isMounted = open || !destroyOnClose;
  let animationState = open ? 'pre-open' : 'closing';
  let transformOrigin = { x: 0, y: 0 };
  let scrollLocked = false;
  let closeTimer = null;
  let openTimer = null;
  let openSequence = 0;
  let focusScopeId = null;

  if (typeof document !== 'undefined') {
    ensureModalInteractionTracker();
  }

  $: panelStyle = styleObjectToString({
    ...style,
    width: width ? `${width}px` : style && style.width,
    '--srk-modal-origin-x': `${transformOrigin.x}px`,
    '--srk-modal-origin-y': `${transformOrigin.y}px`,
    '--srk-modal-max-width': width ? `${width}px` : style && typeof style.width === 'string' ? style.width : undefined,
  });

  $: shouldRender = open || isMounted || !destroyOnClose;
  $: syncFocusScope(open, shouldRender, dialogElement);
  $: syncScrollLock(open || (destroyOnClose && isMounted));
  $: syncOpenState(open);

  function requestClose(reason) {
    dispatch('close', reason);
  }

  function syncFocusScope(isOpen, canRender, element) {
    if (isOpen && canRender && element && focusScopeId === null) {
      focusScopeId = registerModalFocusScope(element, {
        onEscape: handleEscape,
      });
      return;
    }

    if (!isOpen && focusScopeId !== null) {
      unregisterModalFocusScope(focusScopeId);
      focusScopeId = null;
    }
  }

  function handleEscape(event) {
    if (open && closeOnEsc) {
      requestClose('escape');
    }
  }

  function handleMaskMouseDown(event) {
    if (closeOnMaskClick && event.target === event.currentTarget) {
      requestClose('mask');
    }
  }

  function clearTimers() {
    if (closeTimer !== null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (openTimer !== null) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  }

  function nextRenderTurn() {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  async function queueOpenAnimation(sequence) {
    await tick();
    await nextRenderTurn();
    if (sequence !== openSequence || !open || !isMounted || animationState !== 'pre-open' || !dialogElement || !dialogElement.isConnected) {
      return;
    }
    const resolution = resolveModalTransformOrigin(dialogElement || null);
    transformOrigin = resolution.origin;
    openTimer = setTimeout(() => {
      if (sequence !== openSequence || !open) {
        openTimer = null;
        return;
      }
      animationState = 'opening';
      openTimer = null;
    }, 0);
  }

  async function syncOpenState(isOpen) {
    clearTimers();

    if (isOpen) {
      const sequence = ++openSequence;
      isMounted = true;
      transformOrigin = { x: 0, y: 0 };
      animationState = 'pre-open';
      await queueOpenAnimation(sequence);
      return;
    }

    openSequence += 1;

    syncFocusScope(false, shouldRender, dialogElement);
    animationState = 'closing';
    if (!destroyOnClose) {
      isMounted = true;
      return;
    }

    if (isMounted) {
      closeTimer = setTimeout(() => {
        isMounted = false;
        closeTimer = null;
      }, MODAL_ANIMATION_DURATION_MS);
    }
  }

  function syncScrollLock(isOpen) {
    if (typeof document === 'undefined') {
      return;
    }
    if (isOpen && !scrollLocked) {
      lockModalBodyScroll();
      scrollLocked = true;
    } else if (!isOpen && scrollLocked) {
      unlockModalBodyScroll();
      scrollLocked = false;
    }
  }

  onDestroy(() => {
    clearTimers();
    unregisterModalFocusScope(focusScopeId);
    focusScopeId = null;
    if (scrollLocked) {
      unlockModalBodyScroll();
    }
  });
</script>

{#if shouldRender}
  <div class={['srk-modal-root', SRK_ANIMATED_MODAL_ROOT_CLASS, rootClassName].filter(Boolean).join(' ')} data-srk-modal-state={animationState}>
    <div class="srk-modal-mask"></div>
    <div
      class={['srk-modal-wrap', wrapClassName].filter(Boolean).join(' ')}
      tabindex="-1"
      on:mousedown={handleMaskMouseDown}
    >
      <div
        aria-label={title || undefined}
        aria-modal="true"
        class="srk-modal"
        data-srk-modal-panel="true"
        role="dialog"
        style={panelStyle}
        tabindex="-1"
        bind:this={dialogElement}
      >
        <div class="srk-modal-content">
          <button aria-label="Close" class="srk-modal-close" type="button" on:click={() => requestClose('close-button')}>
            <span class="srk-modal-close-x"></span>
          </button>
          {#if title !== undefined}
            <div class="srk-modal-header">
              <div class="srk-modal-title">{title}</div>
            </div>
          {/if}
          <div class="srk-modal-body">
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
