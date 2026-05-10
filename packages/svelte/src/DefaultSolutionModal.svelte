<script>
  import {
    formatSolutionTimestamp,
    getSolutionModalTitle,
    getSolutionResultMeta,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let open = false;
  export let user = null;
  export let problem = undefined;
  export let problemIndex = 0;
  export let solutions = [];
  export let title = undefined;
  export let width = 320;
  export let rootClassName = 'srk-general-modal-root';
  export let wrapClassName = 'srk-solutions-modal';
  export let style = {};
  let cachedPayload = user
    ? {
        user,
        problem,
        problemIndex,
        solutions,
      }
    : null;

  const dispatch = createEventDispatcher();

  $: if (user) {
    cachedPayload = {
      user,
      problem,
      problemIndex,
      solutions,
    };
  }

  $: resolvedTitle = title || (cachedPayload ? getSolutionModalTitle(cachedPayload.problemIndex, cachedPayload.user) : '');
</script>

{#if cachedPayload}
  <Modal
    {open}
    title={resolvedTitle}
    {width}
    {rootClassName}
    {wrapClassName}
    {style}
    on:close={(event) => dispatch('close', event.detail)}
  >
    <table class="srk-common-table srk-solutions-table" aria-label={problem && problem.alias ? `Solutions for ${problem.alias}` : undefined}>
      <thead>
        <tr>
          <th class="srk--text-left">Result</th>
          <th class="srk--text-right">Time</th>
        </tr>
      </thead>
      <tbody>
        {#each cachedPayload.solutions as solution, index (`${solution.result}_${solution.time && solution.time[0]}_${index}`)}
          {@const meta = getSolutionResultMeta(solution.result)}
          <tr>
            <td>
              <span class={`srk-solution-result-text ${meta.className || ''}`}>
                {meta.label}
              </span>
            </td>
            <td class="srk--text-right">{formatSolutionTimestamp(solution)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Modal>
{/if}
