import App from './App.svelte';
import demoData from '../../../demo.json';
import './style.css';

new App({
  target: document.getElementById('app')!,
  props: { initialRanklist: demoData },
});
