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
  /** Hide the default title's problem label and display first blood as accepted when false. Defaults to true. */
  problemRevealed?: boolean;
  solutions: srk.Solution[];
  title?: ReactNode;
  width?: number;
  languages?: readonly string[];
}

export function DefaultSolutionModal({
  open,
  user,
  problem,
  problemIndex,
  problemRevealed = true,
  solutions,
  title,
  width = 320,
  languages,
  onClose,
  rootClassName = 'srk-general-modal-root',
  wrapClassName = 'srk-solutions-modal',
  style,
}: DefaultSolutionModalProps) {
  const [cachedPayload, setCachedPayload] = React.useState<{
    user: srk.User;
    problem?: srk.Problem;
    problemIndex: number;
    problemRevealed: boolean;
    solutions: srk.Solution[];
  } | null>(
    user
      ? {
          user,
          problem,
          problemIndex,
          problemRevealed,
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
        problemRevealed,
        solutions,
      });
    }
  }, [problem, problemIndex, problemRevealed, solutions, user]);

  // Use live props immediately; retain the entire last payload only for the exit animation.
  const payload = user ? { user, problem, problemIndex, problemRevealed, solutions } : cachedPayload;
  if (!payload) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      rootClassName={rootClassName}
      style={style}
      title={title || getSolutionModalTitle(payload.problemIndex, payload.user, languages, payload.problemRevealed)}
      width={width}
      wrapClassName={wrapClassName}
    >
      <SolutionTable solutions={payload.solutions} problemRevealed={payload.problemRevealed} />
    </Modal>
  );
}
