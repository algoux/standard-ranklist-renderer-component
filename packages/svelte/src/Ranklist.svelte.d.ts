import { SvelteComponentTyped } from 'svelte';
import type {
  ProblemHeaderCellSlotProps,
  RanklistEvents,
  RanklistProps,
  StatusCellSlotProps,
  UserCellSlotProps,
} from './types';

export default class Ranklist extends SvelteComponentTyped<
  RanklistProps,
  RanklistEvents,
  {
    'problem-header-cell': ProblemHeaderCellSlotProps;
    'user-cell': UserCellSlotProps;
    'status-cell': StatusCellSlotProps;
  }
> {}
