import React from 'react';
import { act, render } from '@testing-library/react';
import { describeCCPC26Contract } from '../../../../tests/shared/ccpc26-contract';
import { DefaultSolutionModal, Ranklist } from '..';

describeCCPC26Contract({
  target: 'React',
  renderRanklist(props) {
    const view = render(<Ranklist {...props} />);
    return {
      container: view.container,
      update: (next) => view.rerender(<Ranklist {...next} />),
      flush: async () => {
        await act(async () => {});
      },
      cleanup: () => view.unmount(),
    };
  },
  renderModal(props) {
    const view = render(<DefaultSolutionModal {...props} />);
    return {
      container: document.body,
      update: (next) => view.rerender(<DefaultSolutionModal {...next} />),
      flush: async () => {
        await act(async () => {});
      },
      cleanup: () => view.unmount(),
    };
  },
});
