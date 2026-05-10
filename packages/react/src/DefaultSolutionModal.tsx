import React from 'react';
import type { ReactNode } from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { getSolutionModalTitle } from '@algoux/standard-ranklist-renderer-component-core';
import { Modal, type ModalProps } from './Modal';
import { SolutionTable } from './internal/SolutionTable';

export interface DefaultSolutionModalProps
  extends Pick<ModalProps, 'open' | 'onClose' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  problem?: srk.Problem;
  problemIndex: number;
  solutions: srk.Solution[];
  title?: ReactNode;
  width?: number;
}

export function DefaultSolutionModal({
  open,
  user,
  problem,
  problemIndex,
  solutions,
  title,
  width = 320,
  onClose,
  rootClassName = 'srk-general-modal-root',
  wrapClassName = 'srk-solutions-modal',
  style,
}: DefaultSolutionModalProps) {
  const [cachedPayload, setCachedPayload] = React.useState<{
    user: srk.User;
    problem?: srk.Problem;
    problemIndex: number;
    solutions: srk.Solution[];
  } | null>(
    user
      ? {
          user,
          problem,
          problemIndex,
          solutions,
        }
      : null,
  );

  React.useEffect(() => {
    if (user) {
      setCachedPayload({
        user,
        problem,
        problemIndex,
        solutions,
      });
    }
  }, [problem, problemIndex, solutions, user]);

  if (!cachedPayload) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      rootClassName={rootClassName}
      style={style}
      title={title || getSolutionModalTitle(cachedPayload.problemIndex, cachedPayload.user)}
      width={width}
      wrapClassName={wrapClassName}
    >
      <SolutionTable solutions={cachedPayload.solutions} />
    </Modal>
  );
}
