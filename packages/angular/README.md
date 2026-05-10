# @algoux/standard-ranklist-renderer-component-angular

Angular standalone components and template directives for Standard Ranklist data.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-angular @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `RanklistComponent`
- `ProgressBarComponent`
- `ModalComponent`
- `DefaultUserModalComponent`
- `DefaultSolutionModalComponent`
- `SrkUserCellTemplateDirective`
- `SrkStatusCellTemplateDirective`

## Usage

Import the standalone components you use, and import the shared stylesheet once in your application styles or entry. `RanklistComponent` expects a static ranklist, so convert an SRK ranklist before binding it.

```ts
import { Component } from '@angular/core';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModalComponent,
  DefaultUserModalComponent,
  ProgressBarComponent,
  RanklistComponent,
  type SolutionClickPayload,
  type UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-angular';
import '@algoux/standard-ranklist-renderer-component-styles';

@Component({
  standalone: true,
  imports: [
    DefaultSolutionModalComponent,
    DefaultUserModalComponent,
    ProgressBarComponent,
    RanklistComponent,
  ],
  template: `
    <srk-progress-bar
      [data]="ranklist"
      [enableTimeTravel]="true"
      (timeTravel)="handleTimeTravel($event)"
    ></srk-progress-bar>
    <srk-ranklist
      [data]="staticRanklist"
      [stripedRows]="true"
      (userClick)="handleUserClick($event)"
      (solutionClick)="handleSolutionClick($event)"
    ></srk-ranklist>
    <srk-default-user-modal
      [open]="!!activeUser"
      [user]="activeUser?.user"
      [markers]="staticRanklist.markers"
      (close)="activeUser = null"
    ></srk-default-user-modal>
    <srk-default-solution-modal
      [open]="!!activeSolution"
      [user]="activeSolution?.user"
      [problem]="activeSolution?.problem"
      [problemIndex]="activeSolution?.problemIndex ?? 0"
      [solutions]="activeSolution?.solutions || []"
      (close)="activeSolution = null"
    ></srk-default-solution-modal>
  `,
})
export class BoardComponent {
  ranklist!: any;
  activeUser: UserClickPayload | null = null;
  activeSolution: SolutionClickPayload | null = null;

  get staticRanklist() {
    return convertToStaticRanklist(this.ranklist);
  }

  handleTimeTravel(time: number | null) {
    console.log(time);
  }

  handleUserClick(payload: UserClickPayload) {
    this.activeUser = payload;
    this.activeSolution = null;
  }

  handleSolutionClick(payload: SolutionClickPayload) {
    this.activeSolution = payload;
    this.activeUser = null;
  }
}
```

Use `ModalComponent` directly when you want custom modal content. `SrkUserCellTemplateDirective` and `SrkStatusCellTemplateDirective` let you replace selected ranklist table cells with Angular templates.
