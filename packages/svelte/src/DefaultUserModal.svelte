<script>
  import { EnumTheme, resolveText, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
  import {
    getMarkerPresentation,
    resolveSrkAssetUrl,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let open = false;
  export let user = null;
  export let markers = [];
  export let theme = EnumTheme.light;
  export let title = 'User Info';
  export let width = 420;
  export let rootClassName = 'srk-general-modal-root';
  export let wrapClassName = 'srk-user-modal';
  export let style = {};
  export let formatSrkAssetUrl = undefined;
  export let languages = undefined;
  let cachedUser = user;

  const dispatch = createEventDispatcher();

  $: if (user) {
    cachedUser = user;
  }

  $: resolvedMarkers = cachedUser
    ? resolveUserMarkers(cachedUser, markers).map((marker) => ({
        marker,
        presentation: getMarkerPresentation(marker, theme),
      }))
    : [];

  function formatAssetUrl(url, field) {
    return resolveSrkAssetUrl(url, field, formatSrkAssetUrl);
  }

  function resolveDisplayText(text) {
    return resolveText(text, languages);
  }
</script>

{#if cachedUser}
  <Modal
    {open}
    {title}
    {width}
    {rootClassName}
    {wrapClassName}
    {style}
    on:close={(event) => dispatch('close', event.detail)}
  >
    <div class="srk-user-modal-info">
      <h3 class="srk-user-modal-info-user-name">{resolveDisplayText(cachedUser.name)}</h3>
      {#if cachedUser.organization}
        <p class="srk-user-modal-info-user-second-name">{resolveDisplayText(cachedUser.organization)}</p>
      {/if}
      <div class="srk-user-modal-info-labels">
        <span class="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
          {cachedUser.official === false ? '＊ 非正式参加者' : '正式参加者'}
        </span>
        {#each resolvedMarkers as entry (entry.marker.id)}
          <span
            class={`srk-user-modal-info-labels-label ${entry.presentation.className || ''}`}
            style:background-color={entry.presentation.style && entry.presentation.style.backgroundColor}
          >
            {resolveDisplayText(entry.marker.label)}
          </span>
        {/each}
      </div>
      {#if cachedUser.teamMembers && cachedUser.teamMembers.length}
        <div class="srk-user-modal-info-team-members">
          {#each cachedUser.teamMembers as member, index (resolveDisplayText(member.name))}
            {#if index > 0}
              <span class="srk-user-modal-info-team-members-slash"> / </span>
            {/if}
            <span>{resolveDisplayText(member.name)}</span>
          {/each}
        </div>
      {/if}
      {#if cachedUser.photo}
        <div class="srk-user-modal-info-photo">
          <img src={formatAssetUrl(cachedUser.photo, 'user.photo')} alt="User portrait" class="srk-user-modal-info-photo-img" />
        </div>
      {/if}
    </div>
  </Modal>
{/if}
