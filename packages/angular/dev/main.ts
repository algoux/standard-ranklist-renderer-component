import 'zone.js';
import '@angular/compiler';
import '@algoux/standard-ranklist-renderer-component-styles';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import './style.css';

bootstrapApplication(AppComponent).catch((error) => console.error(error));
