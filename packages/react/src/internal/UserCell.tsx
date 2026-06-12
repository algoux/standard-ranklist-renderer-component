import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText, resolveUserMarkers, EnumTheme } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getMarkerPresentation,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { StaticRanklist, StaticRanklistRow, UserClickPayload } from '@algoux/standard-ranklist-renderer-component-core';

export interface UserCellProps {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  markers?: srk.Marker[];
  theme: EnumTheme;
  formatSrkAssetUrl: (url: string, field: string) => string;
  onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  hideOrganization?: boolean;
  hideAvatar?: boolean;
  languages?: readonly string[];
}

export function UserCell({
  user,
  row,
  rowIndex,
  ranklist,
  markers = [],
  theme,
  formatSrkAssetUrl,
  onUserClick,
  hideOrganization,
  hideAvatar,
  languages,
}: UserCellProps) {
  const userMarkers = resolveUserMarkers(user, markers);
  const markerCalcStyles = userMarkers.map((marker) => getMarkerPresentation(marker, theme));
  const name = resolveText(user.name, languages);

  return (
    <td
      className={classnames('srk--text-left srk--nowrap srk-user-cell', {
        'srk--cursor-pointer': !!onUserClick,
      })}
      title=""
      onClick={(event) => {
        event.preventDefault();
        captureModalTriggerPointFromMouseEvent(event.nativeEvent, {
          source: 'user-cell',
          context: {
            rowIndex,
            userId: user.id || null,
            userName: name,
          },
        });
        onUserClick?.({
          user,
          row,
          rowIndex,
          ranklist,
        });
      }}
    >
      <div className="srk-user-cell-content">
        {user.avatar && !hideAvatar && (
          <div className="srk-user-avatar">
            <img src={formatSrkAssetUrl(user.avatar, 'user.avatar')} alt="User Avatar" />
          </div>
        )}
        <div className="srk-user-body">
          <div className="srk-user-name-row">
            <span className="srk-user-name-text" title={name}>
              {name}
            </span>
            <span className="srk-marker-dot-group">
              {markerCalcStyles.map((markerStyle, index) => (
                <span
                  key={userMarkers[index].id}
                  className={classnames('srk-marker srk-marker-dot srk--c-tooltip', markerStyle.className)}
                  style={markerStyle.style}
                  data-tooltip={resolveText(userMarkers[index].label, languages)}
                ></span>
              ))}
            </span>
          </div>
          {!!user.organization && !hideOrganization && (
            <p className="srk-user-secondary-text srk--text-ellipsis" title="">
              {resolveText(user.organization, languages)}
            </p>
          )}
        </div>
      </div>
    </td>
  );
}
