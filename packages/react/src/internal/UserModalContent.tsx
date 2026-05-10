import type * as srk from '@algoux/standard-ranklist';
import { resolveText, EnumTheme } from '@algoux/standard-ranklist-utils';
import { MarkerLabel } from '../MarkerLabel';

export interface UserModalContentProps {
  user: srk.User;
  userMarkers: srk.Marker[];
  theme: EnumTheme;
  formatSrkAssetUrl: (url: string, field: string) => string;
}

export function UserModalContent({ user, userMarkers, theme, formatSrkAssetUrl }: UserModalContentProps) {
  const hasMembers = !!user.teamMembers && user.teamMembers.length > 0;

  return (
    <div className="srk-user-modal-info">
      <h3 className="srk-user-modal-info-user-name">{resolveText(user.name)}</h3>
      {!!user.organization && <p className="srk-user-modal-info-user-second-name">{resolveText(user.organization)}</p>}
      <div className="srk-user-modal-info-labels">
        <span className="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
          {user.official === false ? '＊ 非正式参加者' : '正式参加者'}
        </span>
        {userMarkers.map((marker, index) => (
          <MarkerLabel key={index} marker={marker} theme={theme} className="srk-user-modal-info-labels-label" />
        ))}
      </div>
      {hasMembers && (
        <div className="srk-user-modal-info-team-members">
          {user.teamMembers!.map((member, index) => (
            <span key={resolveText(member.name)}>
              {index > 0 && <span className="srk-user-modal-info-team-members-slash"> / </span>}
              <span>{resolveText(member.name)}</span>
            </span>
          ))}
        </div>
      )}
      {user.photo && (
        <div className="srk-user-modal-info-photo">
          <img src={formatSrkAssetUrl(user.photo, 'user.photo')} alt="User portrait" className="srk-user-modal-info-photo-img" />
        </div>
      )}
    </div>
  );
}
