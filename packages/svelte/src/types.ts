import type * as srk from '@algoux/standard-ranklist';
import type { EnumTheme } from '@algoux/standard-ranklist-utils';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-core';

export interface RanklistProps {
  data: StaticRanklist;
  theme?: EnumTheme;
  rowBordered?: boolean;
  columnBordered?: boolean;
  rowStriped?: boolean;
  formatSrkAssetUrl?: (url: string, field: string) => string;
  splitOrganization?: boolean;
  columnTitles?: RanklistColumnTitles;
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  showProblemStatisticsFooter?: boolean;
  showDirtColumn?: boolean;
  showSEColumn?: boolean;
  emptyStatusPlaceholder?: string | null;
  userAvatarPlacement?: RanklistUserAvatarPlacement;
}

export interface ProblemHeaderCellSlotProps {
  problem: srk.Problem;
  problemIndex: number;
  index: number;
  theme?: EnumTheme;
}

export interface UserCellSlotProps {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  markers?: srk.Marker[];
  theme?: EnumTheme;
  hideOrganization?: boolean;
  hideAvatar?: boolean;
  onClick: (event?: MouseEvent) => void;
}

export interface StatusCellSlotProps {
  status: srk.RankProblemStatus;
  problem: srk.Problem | undefined;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  solutions: srk.Solution[];
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  emptyStatusPlaceholder?: string | null;
  onClick: (event?: MouseEvent) => void;
}

export interface ProgressBarProps {
  data: srk.Ranklist;
  enableTimeTravel?: boolean;
  live?: boolean;
  td?: number;
}

export interface ModalProps {
  open: boolean;
  title?: string;
  width?: number;
  rootClassName?: string;
  wrapClassName?: string;
  style?: Record<string, string | number | undefined>;
  closeOnEsc?: boolean;
  closeOnMaskClick?: boolean;
}

export interface DefaultUserModalProps extends Pick<ModalProps, 'open' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  markers?: srk.Marker[];
  theme?: EnumTheme;
  title?: string;
  width?: number;
  formatSrkAssetUrl?: (url: string, field: string) => string;
}

export interface DefaultSolutionModalProps extends Pick<ModalProps, 'open' | 'rootClassName' | 'wrapClassName' | 'style'> {
  user?: srk.User | null;
  problem?: srk.Problem;
  problemIndex?: number;
  solutions?: srk.Solution[];
  title?: string;
  width?: number;
}

export type RanklistEvents = {
  solutionClick: CustomEvent<SolutionClickPayload>;
  userClick: CustomEvent<UserClickPayload>;
};

export type ProgressBarEvents = {
  timeTravel: CustomEvent<number | null>;
};

export type ModalEvents = {
  close: CustomEvent<'mask' | 'close-button' | 'escape'>;
};

export type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
  UserClickPayload,
};
