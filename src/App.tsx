import React from 'react';
import data from '../demo.json';
import { Ranklist, convertToStaticRanklist } from './lib/main';
// import './lib/Ranklist.less';
import 'rc-dialog/assets/index.css';
import * as Utils from './lib/utils';
import { ProgressBar } from './lib/ProgressBar';

export default class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      data,
      // @ts-ignore
      solutions: Utils.getSortedCalculatedRawSolutions(data.rows),
    };
  }

  handleTimeTravel = (time: number) => {
    console.log('time travel:', time, 'ms');
    if (time === null) {
      this.setState({ data });
      return;
    }
    // @ts-ignore
    const filteredSolutions = Utils.filterSolutionsUntil(this.state.solutions, [time, 'ms'])
    // @ts-ignore
    const newSrk = Utils.regenerateRanklistBySolutions(data, filteredSolutions);
    this.setState({ data: newSrk });
  }
  
  render() {
    return (
      <div className="app">
        <div style={{ height: '40px' }}></div>
        {/* @ts-ignore */}
        <ProgressBar data={data} td={Date.now() - new Date(data._now).getTime()} live enableTimeTravel onTimeTravel={this.handleTimeTravel} />
        <div style={{ height: '20px' }}></div>
        {/* @ts-ignore */}
        <Ranklist data={convertToStaticRanklist(this.state.data)} theme="light" />
      </div>
    );
  }
}
