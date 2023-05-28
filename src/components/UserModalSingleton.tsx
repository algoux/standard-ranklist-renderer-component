import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import GeneralModal from './GeneralModal';
import type { GeneralModalProps } from './GeneralModal';

export interface UserModalOptions {
  title: React.ReactNode;
  content: React.ReactNode;
  width?: number;
}

export default class UserModalSingleton {
  dom: Element | null;
  ref: GeneralModal | null;

  constructor(private readonly options: GeneralModalProps) {
    this.dom = null;
    this.ref = null;
  }

  mountToDom() {
    if (!this.dom) {
      this.dom = document.createElement('div');
      this.dom.id = 'srk-user-modal';
      document.body.appendChild(this.dom);
    }
    ReactDOM.render(
      <GeneralModal {...this.options} ref={(ref) => (this.ref = ref)} />,
      this.dom,
    );
  }

  modal(options: UserModalOptions, e?: React.MouseEvent) {
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
      width: options.width,
    });
  }

  destroy() {
    this.dom && unmountComponentAtNode(this.dom);
  }

  static getInstance = (function () {
    let instance: UserModalSingleton;
    return function () {
      if (!instance) {
        instance = new UserModalSingleton({
          rootClassName: 'srk-general-modal-root',
          wrapClassName: 'srk-user-modal',
          style: {
            // width: '360px',
          },
        });
      }
      return instance;
    };
  })();
}
