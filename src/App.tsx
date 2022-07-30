import React from 'react';
import data from '../demo.json';
import Ranklist from './lib/Ranklist';
// import './lib/Ranklist.less';
import 'rc-dialog/assets/index.css';

export default class App extends React.Component {
  render() {
    return (
      <div className="app">
        {/* @ts-ignore */}
        <Ranklist data={data} theme="light" />
      </div>
    );
  }
}
