<script>
  import { getRankProblemDisplayStatus } from '@algoux/standard-ranklist-renderer-component-core';
  export let status;
  export let problemIndex;
  export let problemRevealed;
  export let onClick;
  const mountedFor = problemIndex;
  $: displayStatus = getRankProblemDisplayStatus(status, problemRevealed);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<td
  data-problem-index={problemIndex}
  data-mounted-for={mountedFor}
  data-revealed={String(problemRevealed)}
  data-raw-result={status.result}
  data-display-result={displayStatus.result}
  on:click={onClick}
>{problemIndex}</td>
