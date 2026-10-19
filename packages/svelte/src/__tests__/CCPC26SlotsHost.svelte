<script>
  import Ranklist from '../Ranklist.svelte';
  import CCPC26StatusProbe from './CCPC26StatusProbe.svelte';
  export let data;
  export let enableCCPC26 = true;
</script>

<Ranklist {data} {enableCCPC26} on:solutionClick>
  <span slot="problem-header-cell" let:problem let:problemIndex let:className data-header-index={problemIndex} class={className}>
    {problem.alias}
  </span>
  <CCPC26StatusProbe
    slot="status-cell"
    let:status
    let:problemIndex
    let:problemRevealed
    let:onClick
    {status}
    {problemIndex}
    {problemRevealed}
    {onClick}
  />
</Ranklist>
