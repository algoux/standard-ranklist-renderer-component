import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import GeneralModal from './GeneralModal';
import type { GeneralModalProps } from './GeneralModal';

export interface SolutionsModalOptions {
  title: React.ReactNode;
  content: React.ReactNode;
}

export default class SolutionsModalSingleton {
  dom: Element | null;
  ref: GeneralModal | null;

  constructor(private readonly options: GeneralModalProps) {
    this.dom = null;
    this.ref = null;
  }

  mountToDom() {
    if (!this.dom) {
      this.dom = document.createElement('div');
      this.dom.id = 'srk-solution-modal';
      document.body.appendChild(this.dom);
    }
    ReactDOM.render(
      <GeneralModal {...this.options} ref={(ref) => (this.ref = ref)} />,
      this.dom,
    );
  }

  modal(options: SolutionsModalOptions, e?: React.MouseEvent) {
    if (!this.ref) {
      this.mountToDom();
    }
    this.ref?.setState({
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
          rootClassName: 'srk-general-modal-root',
          wrapClassName: 'srk-solutions-modal',
          style: {
            // width: '320px',
          },
        });
      }
      return instance;
    };
  })();
}
