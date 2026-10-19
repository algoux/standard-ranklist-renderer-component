import { render } from 'solid-js/web';
import type * as srk from '@algoux/standard-ranklist';
import demoData from '../../../demo.json';

import App from './App';

render(() => <App initialRanklist={demoData as unknown as srk.Ranklist} />, document.getElementById('root')!);
