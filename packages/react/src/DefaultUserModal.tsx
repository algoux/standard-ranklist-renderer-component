import React from 'react';
import type { ReactNode } from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
import { resolveSrkAssetUrl } from '@algoux/standard-ranklist-renderer-component-core';
import { Modal, type ModalProps } from './Modal';
import { UserModalContent } from './internal/UserModalContent';

export interface DefaultUserModalProps
  extends Pick<ModalProps, 'open' | 'onClose' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  markers?: srk.Marker[];
  theme?: EnumTheme;
  title?: ReactNode;
  width?: number;
  formatSrkAssetUrl?: (url: string, field: string) => string;
  languages?: readonly string[];
}

export function DefaultUserModal({
  open,
  user,
  markers = [],
  theme = EnumTheme.light,
  title = 'User Info',
  width = 420,
  formatSrkAssetUrl,
  languages,
  onClose,
  rootClassName = 'srk-general-modal-root',
  wrapClassName = 'srk-user-modal',
  style,
}: DefaultUserModalProps) {
  const [cachedUser, setCachedUser] = React.useState<srk.User | null>(user || null);

  React.useEffect(() => {
    if (user) {
      setCachedUser(user);
    }
  }, [user]);

  if (!cachedUser) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      rootClassName={rootClassName}
      style={style}
      title={title}
      width={width}
      wrapClassName={wrapClassName}
    >
      <UserModalContent
        user={cachedUser}
        userMarkers={resolveUserMarkers(cachedUser, markers)}
        theme={theme}
        formatSrkAssetUrl={(url, field) => resolveSrkAssetUrl(url, field, formatSrkAssetUrl)}
        languages={languages}
      />
    </Modal>
  );
}
