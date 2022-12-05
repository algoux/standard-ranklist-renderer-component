import React from 'react';
import data from '../demo.json';
import { Ranklist, convertToStaticRanklist } from './lib/main';
// import './lib/Ranklist.less';
import 'rc-dialog/assets/index.css';

export default class App extends React.Component {
  render() {
    return (
      <div className="app">
        {/* @ts-ignore */}
        <Ranklist data={convertToStaticRanklist(data)} theme="light" />
      </div>
    );
  }
}
