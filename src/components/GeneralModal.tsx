import React from 'react';
import Dialog from 'rc-dialog';
// import 'rc-dialog/assets/index.css';

export interface GeneralModalProps {
  rootClassName?: string;
  wrapClassName?: string;
  style?: React.CSSProperties;
}

interface State {
  title: React.ReactNode;
  content: React.ReactNode;
  mousePosition?: {
    x: number;
    y: number;
  };
  visible: boolean;
  width?: number;
}

export default class GeneralModal extends React.Component<GeneralModalProps, State> {
  constructor(props: GeneralModalProps) {
    super(props);
    this.state = {
      title: '',
      content: null,
      mousePosition: undefined,
      visible: false,
      width: 320,
    };
  }

  onClose = (e: React.SyntheticEvent) => {
    this.setState({
      visible: false,
    });
  };

  render() {
    const { style, wrapClassName, rootClassName } = this.props;
    const { title, content, mousePosition } = this.state;
    return (
      <Dialog
        visible={this.state.visible}
        rootClassName={rootClassName}
        wrapClassName={wrapClassName}
        animation="zoom"
        maskAnimation="fade"
        title={title}
        onClose={this.onClose}
        mousePosition={mousePosition}
        width={this.state.width}
        style={style}
      >
        {content}
      </Dialog>
    );
  }
}
