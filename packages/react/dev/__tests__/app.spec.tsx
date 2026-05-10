import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import App from '../App';

describe('Local demo app', () => {
  afterEach(() => {
    cleanup();
    resetModalInteractionStateForTests();
  });

  it('composes the default user modal from Ranklist click events', () => {
    const { container } = render(<App />);

    const userCell = container.querySelector('tbody td.srk-user-cell') as HTMLElement | null;
    expect(userCell).toBeTruthy();
    fireEvent.click(userCell!);

    expect(screen.getByText('User Info')).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-user-modal')).toBeTruthy();
  });

  it('composes the default solution modal from Ranklist click events', () => {
    const { container } = render(<App />);

    const statusCell = container.querySelector('tbody td.srk-prest-status-block-accepted') as HTMLElement | null;
    expect(statusCell).toBeTruthy();
    fireEvent.click(statusCell!);

    expect(screen.getByText(/Solutions of/)).toBeTruthy();
    expect(container.ownerDocument.body.querySelector('.srk-solutions-modal')).toBeTruthy();
  });

  it('uses the first click position for the first modal open after a fresh render', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this instanceof HTMLElement && this.classList.contains('srk-modal')) {
        return {
          x: 200,
          y: 100,
          left: 200,
          top: 100,
          right: 620,
          bottom: 340,
          width: 420,
          height: 240,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    };

    try {
      const { container } = render(<App />);

      const userCell = container.querySelector('tbody td.srk-user-cell') as HTMLElement | null;
      expect(userCell).toBeTruthy();
      fireEvent.click(userCell!, { clientX: 60, clientY: 40 });

      await screen.findByText('User Info');
      await waitFor(() => {
        const dialog = container.ownerDocument.body.querySelector('.srk-modal') as HTMLElement | null;
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-x')).toBe('-140px');
        expect(dialog?.style.getPropertyValue('--srk-modal-origin-y')).toBe('-60px');
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});