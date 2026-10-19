import 'zone.js';
import '@angular/compiler';
import '@algoux/standard-ranklist-renderer-component-styles';
import { bootstrapApplication } from '@angular/platform-browser';

import type * as srk from '@algoux/standard-ranklist';
import demoData from '../../../demo.json';
import { AppComponent, PREVIEW_RANKLIST } from './app.component';
import './style.css';

bootstrapApplication(AppComponent, { providers: [{ provide: PREVIEW_RANKLIST, useValue: demoData as srk.Ranklist }] }).catch((error) => console.error(error));
