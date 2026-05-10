import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, resolveText, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
import {
  getMarkerPresentation,
  resolveSrkAssetUrl,
} from '@algoux/standard-ranklist-renderer-component-core';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { Modal, type ModalProps } from './Modal';

export interface DefaultUserModalProps
  extends Pick<ModalProps, 'open' | 'onClose' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  markers?: srk.Marker[];
  theme?: EnumTheme;
  title?: string;
  width?: number;
  formatSrkAssetUrl?: (url: string, field: string) => string;
}

export function DefaultUserModal(props: DefaultUserModalProps) {
  const [cachedUser, setCachedUser] = createSignal<srk.User | null>(props.user || null);
  const theme = () => props.theme || EnumTheme.light;
  const markers = () => props.markers || [];
  const resolvedMarkers = (user: srk.User) =>
    resolveUserMarkers(user, markers()).map((marker) => ({
      marker,
      presentation: getMarkerPresentation(marker, theme()),
    }));
  const formatAssetUrl = (url: string, field: string) => resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);

  createEffect(() => {
    if (props.user) {
      setCachedUser(props.user);
    }
  });

  return (
    <Show when={cachedUser()}>
      {(user) => (
        <Modal
          open={props.open}
          onClose={props.onClose}
          rootClassName={props.rootClassName || 'srk-general-modal-root'}
          style={props.style}
          title={props.title || 'User Info'}
          width={props.width || 420}
          wrapClassName={props.wrapClassName || 'srk-user-modal'}
        >
          <div class="srk-user-modal-info">
            <h3 class="srk-user-modal-info-user-name">{resolveText(user().name)}</h3>
            <Show when={user().organization}>
              {(organization) => <p class="srk-user-modal-info-user-second-name">{resolveText(organization())}</p>}
            </Show>
            <div class="srk-user-modal-info-labels">
              <span class="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
                {user().official === false ? '＊ 非正式参加者' : '正式参加者'}
              </span>
              <For each={resolvedMarkers(user())}>
                {(entry) => (
                  <span class={`srk-user-modal-info-labels-label ${entry.presentation.className || ''}`} style={entry.presentation.style}>
                    {resolveText(entry.marker.label)}
                  </span>
                )}
              </For>
            </div>
            <Show when={user().teamMembers?.length}>
              <div class="srk-user-modal-info-team-members">
                <For each={user().teamMembers}>
                  {(member, index) => (
                    <>
                      <Show when={index() > 0}>
                        <span class="srk-user-modal-info-team-members-slash"> / </span>
                      </Show>
                      <span>{resolveText(member.name)}</span>
                    </>
                  )}
                </For>
              </div>
            </Show>
            <Show when={user().photo}>
              {(photo) => (
                <div class="srk-user-modal-info-photo">
                  <img src={formatAssetUrl(photo(), 'user.photo')} alt="User portrait" class="srk-user-modal-info-photo-img" />
                </div>
              )}
            </Show>
          </div>
        </Modal>
      )}
    </Show>
  );
}
