<script>
  import Modal from '../Modal.svelte';
  import { createEventDispatcher } from 'svelte';

  export let open = true;
  export let title = 'Standalone Modal';
  export let body = 'Modal body';
  export let width = undefined;
  export let rootClassName = undefined;
  export let wrapClassName = undefined;
  export let style = {};
  export let destroyOnClose = true;
  export let closeOnEsc = true;
  export let closeOnMaskClick = true;

  const dispatch = createEventDispatcher();
</script>

<Modal
  {open}
  {title}
  {width}
  {rootClassName}
  {wrapClassName}
  {style}
  {destroyOnClose}
  {closeOnEsc}
  {closeOnMaskClick}
  on:close={(event) => dispatch('close', event.detail)}
>
  <span>{body}</span>
</Modal>