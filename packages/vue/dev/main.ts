import { createApp } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import demoData from '../../../demo.json';

import App from './App.vue';
import './style.css';

createApp(App, { initialRanklist: demoData as unknown as srk.Ranklist }).mount('#app');
