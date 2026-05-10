import React from 'react';
import { render } from '@testing-library/react';
import { Ranklist } from '..';
import { describeRanklistDisplayContract } from '../../../../tests/shared/ranklist-display-contract';
import type { RanklistDisplayAdapter } from '../../../../tests/shared/ranklist-display-contract';

const adapter: RanklistDisplayAdapter = {
  target: 'React',
  render(data, props) {
    const result = render(<Ranklist data={data as any} {...props} />);
    return {
      container: result.container,
      cleanup: result.unmount,
    };
  },
};

describeRanklistDisplayContract(adapter);