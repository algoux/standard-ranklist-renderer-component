<script>
  import ProgressBar from '../ProgressBar.svelte';

  export let data;
  export let live = true;
</script>

<ProgressBar {data} {live} enableTimeTravel on:timeTravel>
  <button slot="timeMachine" class="custom-replay">Replay controls</button>
  <strong slot="live" class="custom-live">Streaming</strong>
</ProgressBar>
