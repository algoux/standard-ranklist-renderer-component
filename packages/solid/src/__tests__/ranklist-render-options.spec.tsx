import { render } from 'solid-js/web';
import { createContext, useContext } from 'solid-js';
import {
  describeRanklistRenderOptionsContract,
  makeRenderOptionsRanklist,
} from '../../../../tests/shared/ranklist-render-options-contract';
import type { RanklistRenderOptionsProps } from '../../../../tests/shared/ranklist-render-options-contract';
import { Ranklist } from '../index';

function renderSolid(props: RanklistRenderOptionsProps) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const dispose = render(() => <Ranklist {...(props as any)} />, root);
  return {
    container: root,
    cleanup: () => {
      dispose();
      root.remove();
    },
  };
}

describeRanklistRenderOptionsContract({
  target: 'Solid',
  render: renderSolid,
});

describe('Solid ranklist render option integration', () => {
  it('keeps the common table wrapper as the client root element', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const dispose = render(() => <Ranklist data={makeRenderOptionsRanklist()} />, root);
    const ranklistRoot = root.firstElementChild;

    expect(ranklistRoot?.classList.contains('srk-common-table')).toBe(true);
    expect(ranklistRoot?.classList.contains('srk-main')).toBe(true);
    expect(ranklistRoot?.querySelector(':scope > .srk-common-table')).toBeFalsy();

    dispose();
    root.remove();
  });

  it('preserves parent owner context for custom status parts', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const data = makeRenderOptionsRanklist();
    const StatusContext = createContext('missing-context');
    const dispose = render(
      () => (
        <StatusContext.Provider value="from-parent-context">
          <Ranklist
            data={data}
            parts={{
              statusCell: () => <td data-testid="status-context-owner">{useContext(StatusContext)}</td>,
            }}
          />
        </StatusContext.Provider>
      ),
      root,
    );

    expect(root.querySelector('[data-testid="status-context-owner"]')?.textContent).toBe('from-parent-context');

    dispose();
    root.remove();
  });

});
