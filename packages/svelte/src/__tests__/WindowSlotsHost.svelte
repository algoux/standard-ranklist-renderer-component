<script>
  import Ranklist from '../Ranklist.svelte';
  export let data;
  export let rowWindow = { start: 1, end: 2 };
  export let customUser = false;
</script>

{#if customUser}
  <Ranklist {data} {rowWindow} retainUserText>
    <td slot="user-cell" let:user let:rowIndex data-custom-user={rowIndex}>{user.name}</td>
    <td slot="status-cell" let:rowIndex let:problemIndex let:ranklist data-custom-status={rowIndex} data-problem={problemIndex}>{ranklist.rows.length}</td>
  </Ranklist>
{:else}
  <Ranklist {data} {rowWindow} retainUserText>
    <td slot="status-cell" let:rowIndex let:problemIndex let:ranklist data-custom-status={rowIndex} data-problem={problemIndex}>{ranklist.rows.length}</td>
  </Ranklist>
{/if}
