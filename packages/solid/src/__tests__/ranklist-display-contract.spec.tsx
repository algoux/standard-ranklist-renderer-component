import { render } from 'solid-js/web';
import { Ranklist } from '../index';
import { describeRanklistDisplayContract } from '../../../../tests/shared/ranklist-display-contract';
import type { RanklistDisplayAdapter } from '../../../../tests/shared/ranklist-display-contract';

const adapter: RanklistDisplayAdapter = {
  target: 'Solid',
  render(data, props) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const dispose = render(() => <Ranklist data={data as any} {...props} />, root);
    return {
      container: root,
      cleanup: () => {
        dispose();
        root.remove();
      },
    };
  },
};

describeRanklistDisplayContract(adapter);
