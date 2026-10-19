<script>
  import {
    formatSolutionTimestamp,
    getSolutionModalTitle,
    getSolutionResultMeta,
    getSolutionDisplayResult,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let open = false;
  export let user = null;
  export let problem = undefined;
  export let problemIndex = 0;
  export let problemRevealed = true;
  export let solutions = [];
  export let title = undefined;
  export let width = 320;
  export let rootClassName = 'srk-general-modal-root';
  export let wrapClassName = 'srk-solutions-modal';
  export let style = {};
  export let languages = undefined;
  let cachedPayload = user
    ? {
        user,
        problem,
        problemIndex,
        problemRevealed: problemRevealed !== false,
        solutions,
      }
    : null;

  const dispatch = createEventDispatcher();

  $: if (user) {
    cachedPayload = {
      user,
      problem,
      problemIndex,
      problemRevealed: problemRevealed !== false,
      solutions,
    };
  }

  $: resolvedTitle = title || (cachedPayload ? getSolutionModalTitle(
    cachedPayload.problemIndex,
    cachedPayload.user,
    languages,
    cachedPayload.problemRevealed,
  ) : '');
  $: tableLabel = cachedPayload && cachedPayload.problemRevealed && cachedPayload.problem && cachedPayload.problem.alias
    ? `Solutions for ${cachedPayload.problem.alias}`
    : 'Solutions';
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
    <table class="srk-common-table srk-solutions-table" aria-label={tableLabel}>
      <thead>
        <tr>
          <th class="srk--text-left">Result</th>
          <th class="srk--text-right">Time</th>
        </tr>
      </thead>
      <tbody>
        {#each cachedPayload.solutions as solution, index (`${solution.result}_${solution.time && solution.time[0]}_${index}`)}
          {@const meta = getSolutionResultMeta(getSolutionDisplayResult(solution.result, cachedPayload.problemRevealed))}
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
