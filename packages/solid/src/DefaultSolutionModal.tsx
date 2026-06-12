import type * as srk from '@algoux/standard-ranklist';
import {
  formatSolutionTimestamp,
  getSolutionModalTitle,
  getSolutionResultMeta,
} from '@algoux/standard-ranklist-renderer-component-core';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { Modal, type ModalProps } from './Modal';

export interface DefaultSolutionModalProps
  extends Pick<ModalProps, 'open' | 'onClose' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  problem?: srk.Problem;
  problemIndex: number;
  solutions: srk.Solution[];
  title?: string;
  width?: number;
  languages?: readonly string[];
}

export function DefaultSolutionModal(props: DefaultSolutionModalProps) {
  const [cachedPayload, setCachedPayload] = createSignal<{
    user: srk.User;
    problem?: srk.Problem;
    problemIndex: number;
    solutions: srk.Solution[];
  } | null>(
    props.user
      ? {
          user: props.user,
          problem: props.problem,
          problemIndex: props.problemIndex,
          solutions: props.solutions || [],
        }
      : null,
  );

  createEffect(() => {
    if (props.user) {
      setCachedPayload({
        user: props.user,
        problem: props.problem,
        problemIndex: props.problemIndex,
        solutions: props.solutions || [],
      });
    }
  });

  return (
    <Show when={cachedPayload()}>
      {(payload) => (
        <Modal
          open={props.open}
          onClose={props.onClose}
          rootClassName={props.rootClassName || 'srk-general-modal-root'}
          style={props.style}
          title={props.title || getSolutionModalTitle(payload().problemIndex, payload().user, props.languages)}
          width={props.width || 320}
          wrapClassName={props.wrapClassName || 'srk-solutions-modal'}
        >
          <table class="srk-common-table srk-solutions-table">
            <thead>
              <tr>
                <th class="srk--text-left">Result</th>
                <th class="srk--text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              <For each={payload().solutions}>
                {(solution) => {
                  const meta = () => getSolutionResultMeta(solution.result);
                  return (
                    <tr>
                      <td>
                        <span class={`srk-solution-result-text ${meta().className || ''}`}>{meta().label}</span>
                      </td>
                      <td class="srk--text-right">{formatSolutionTimestamp(solution)}</td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </Modal>
      )}
    </Show>
  );
}
