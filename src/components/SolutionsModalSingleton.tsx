import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import SolutionsModal, { SolutionsModalProps } from './SolutionsModal';

export interface SolutionsModalOptions {
  title: string;
  content: React.ReactNode;
}

export default class SolutionsModalSingleton {
  dom: Element | null;
  ref: SolutionsModal | null;

  constructor(options: SolutionsModalProps) {
    this.dom = null;
    this.ref = null;
    this.newInstance(options);
  }

  newInstance(options: SolutionsModalProps) {
    if (!this.dom) {
      this.dom = document.createElement('div');
      this.dom.id = 'solution-modal';
      document.body.appendChild(this.dom);
    }
    ReactDOM.render(<SolutionsModal {...options} ref={(ref) => (this.ref = ref)} />, this.dom);
  }

  modal(options: SolutionsModalOptions, e?: React.MouseEvent) {
    this.ref &&
      this.ref.setState({
        ...options,
        mousePosition: e && {
          x: e.pageX,
          y: e.pageY,
        },
        visible: true,
      });
  }

  destroy() {
    this.dom && unmountComponentAtNode(this.dom);
  }

  static getInstance = (function () {
    let instance: SolutionsModalSingleton;
    return function () {
      if (!instance) {
        instance = new SolutionsModalSingleton({
          rootClassName: 'srk-solutions-modal-root',
          wrapClassName: 'srk-solutions-modal',
          style: {
            width: '320px',
          },
        });
      }
      return instance;
    };
  })();
}
