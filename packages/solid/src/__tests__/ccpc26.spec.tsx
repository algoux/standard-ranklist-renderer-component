const { createSignal } = await import('solid-js');
const { render } = await import('solid-js/web');
import { describe, expect, it, vi } from 'vitest';
const { Ranklist, DefaultSolutionModal } = await import('../index');
import { describeCCPC26Contract } from '../../../../tests/shared/ccpc26-contract';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

describeCCPC26Contract({
  target: 'Solid',
  renderRanklist(props) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [current, setCurrent] = createSignal(props);
    const dispose = render(() => <Ranklist {...current()} />, root);
    return {
      container: root,
      update(next) {
        setCurrent(next);
      },
      flush: () => Promise.resolve(),
      cleanup() {
        dispose();
        root.remove();
      },
    };
  },
  renderModal(props) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [current, setCurrent] = createSignal(props);
    const dispose = render(() => <DefaultSolutionModal {...current()} />, root);
    return {
      container: document.body,
      update(next) {
        setCurrent(next);
      },
      flush: () => Promise.resolve(),
      cleanup() {
        dispose();
        root.remove();
      },
    };
  },
});

describe('Solid CCPC26 parts', () => {
  it('skips anonymous header hooks and exposes original status and reactive reveal state to parts', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const clicked = vi.fn();
    const indexes: number[] = [];
    const [enabled, setEnabled] = createSignal(true);
    const dispose = render(
      () => (
        <Ranklist
          data={makeCCPC26Ranklist()}
          enableCCPC26={enabled()}
          onSolutionClick={clicked}
          parts={{
            problemHeaderCell: (props) => {
              indexes.push(props.problemIndex);
              return <th class={props.className}>{props.problem.alias}</th>;
            },
            statusCell: (props) => (
              <td
                data-problem-index={props.problemIndex}
                data-revealed={String(props.problemRevealed)}
                onClick={props.onClick}
              >
                {props.status.result}
              </td>
            ),
          }}
        />
      ),
      root,
    );
    try {
      expect(indexes).toEqual([0, 2]);
      expect(root.querySelector('th.srk-ccpc26-revealed-boundary')?.textContent).toBe('C');
      const hidden = root.querySelector<HTMLElement>('td[data-problem-index="1"][data-revealed="false"]')!;
      expect(hidden.textContent).toBe('FB');
      hidden.click();
      expect(clicked.mock.calls[0][0]).toMatchObject({
        problemIndex: 1,
        problemRevealed: false,
        status: { result: 'FB' },
      });
      setEnabled(false);
      expect(root.querySelector('td[data-problem-index="1"]')?.getAttribute('data-revealed')).toBe('true');
    } finally {
      dispose();
      root.remove();
    }
  });
});
