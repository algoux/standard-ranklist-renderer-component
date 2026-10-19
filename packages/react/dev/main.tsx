import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';
import type * as srk from '@algoux/standard-ranklist';
import data from '../../../demo.json';

import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App initialRanklist={data as srk.Ranklist} />
  </React.StrictMode>,
  document.getElementById('root'),
);
