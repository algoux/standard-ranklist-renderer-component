import React from 'react';
import classnames from 'classnames';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getMarkerPresentation,
  isRanklistIdentityClick,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { UserCellProps } from './UserCell';

// These component types stay stable when the controlled rich window changes.
export const RetainedUserCell = React.memo(function RetainedUserCell(
  props: UserCellProps & { rich: boolean; thin: boolean; colSpan: number; userColumn: number },
) {
  const { user, row, rowIndex, ranklist, rich, thin } = props;
  const name = resolveText(user.name, props.languages);
  const markers = resolveUserMarkers(user, props.markers);
  const avatar = !!user.avatar && !props.hideAvatar;
  return (
    <td
      className={classnames('srk--text-left srk--nowrap srk-user-cell srk-search-user-cell', {
        'srk--cursor-pointer': !!props.onUserClick,
        'srk-search-split': props.hideOrganization,
        'srk-search-has-avatar': avatar,
      })}
      colSpan={props.colSpan}
      aria-colindex={props.userColumn + 1}
      aria-colspan={1}
      title=""
      style={
        markers.length
          ? ({ '--srk-search-marker-space': `${4 + markers.length * 16}px` } as React.CSSProperties)
          : undefined
      }
      onClick={(event) => {
        if (thin && !isRanklistIdentityClick(event, props.userColumn)) return;
        event.preventDefault();
        captureModalTriggerPointFromMouseEvent(event.nativeEvent, {
          source: 'user-cell',
          context: { rowIndex, userId: user.id || null, userName: name },
        });
        props.onUserClick?.({ user, row, rowIndex, ranklist });
      }}
    >
      <span key="name" className="srk-user-name-text" data-search-text="name" title={name}>
        {name}
      </span>
      {rich && markers.length > 0 && (
        <span key="markers" className="srk-marker-dot-group srk-search-markers">
          {markers.map((marker) => {
            const presentation = getMarkerPresentation(marker, props.theme);
            return (
              <span
                key={marker.id}
                className={classnames('srk-marker srk-marker-dot srk--c-tooltip', presentation.className)}
                style={presentation.style}
                data-tooltip={resolveText(marker.label, props.languages)}
              />
            );
          })}
        </span>
      )}
      {!!user.organization && !props.hideOrganization && (
        <span
          key="organization"
          className="srk-user-secondary-text srk-search-organization"
          data-search-text="organization"
        >
          {resolveText(user.organization, props.languages)}
        </span>
      )}
      {rich && avatar && (
        <img
          key="avatar"
          className="srk-search-user-avatar"
          src={props.formatSrkAssetUrl(user.avatar!, 'user.avatar')}
          alt="User Avatar"
        />
      )}
    </td>
  );
});

export const RetainedOrganizationCell = React.memo(function RetainedOrganizationCell(props: {
  user: srk.User;
  rich: boolean;
  colSpan: number;
  columnIndex: number;
  showAvatar: boolean;
  languages?: readonly string[];
  formatSrkAssetUrl: UserCellProps['formatSrkAssetUrl'];
}) {
  const text = resolveText(props.user.organization, props.languages);
  const avatar = props.showAvatar && !!props.user.avatar;
  return (
    <td
      className={classnames('srk-organization-cell srk--text-left srk--nowrap srk-search-org-cell', {
        'srk-search-has-avatar': avatar,
      })}
      colSpan={props.colSpan}
      aria-colindex={props.columnIndex + 1}
      aria-colspan={1}
    >
      <span key="organization" className="srk-organization-name-text" data-search-text="organization" title={text}>
        {text}
      </span>
      {props.rich && avatar && (
        <img
          key="avatar"
          className="srk-search-user-avatar"
          src={props.formatSrkAssetUrl(props.user.avatar!, 'user.avatar')}
          alt="User Avatar"
        />
      )}
    </td>
  );
});
