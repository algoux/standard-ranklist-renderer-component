import 'zone.js';
import '@angular/compiler';
import { CommonModule } from '@angular/common';
import {
  Component,
  createComponent,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describeRanklistRenderOptionsContract } from '../../../../../tests/shared/ranklist-render-options-contract';
import type { RanklistRenderOptionsProps } from '../../../../../tests/shared/ranklist-render-options-contract';
import { RanklistComponent } from '../index';

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent],
  template: `
    <srk-ranklist
      [data]="data"
      [splitOrganization]="splitOrganization"
      [columnTitles]="columnTitles"
      [statusCellPreset]="statusCellPreset"
      [statusColorAsText]="statusColorAsText"
      [showProblemStatisticsFooter]="showProblemStatisticsFooter"
      [showDirtColumn]="showDirtColumn"
      [showSEColumn]="showSEColumn"
      [rowBordered]="rowBordered"
      [borderedRows]="borderedRows"
      [columnBordered]="columnBordered"
      [emptyStatusPlaceholder]="emptyStatusPlaceholder"
      [userAvatarPlacement]="userAvatarPlacement"
    />
  `,
})
class RenderOptionsHostComponent {
  data!: RanklistRenderOptionsProps['data'];
  splitOrganization?: RanklistRenderOptionsProps['splitOrganization'];
  columnTitles?: RanklistRenderOptionsProps['columnTitles'];
  statusCellPreset?: RanklistRenderOptionsProps['statusCellPreset'];
  statusColorAsText?: RanklistRenderOptionsProps['statusColorAsText'];
  showProblemStatisticsFooter?: RanklistRenderOptionsProps['showProblemStatisticsFooter'];
  showDirtColumn?: RanklistRenderOptionsProps['showDirtColumn'];
  showSEColumn?: RanklistRenderOptionsProps['showSEColumn'];
  rowBordered?: RanklistRenderOptionsProps['rowBordered'];
  borderedRows?: RanklistRenderOptionsProps['borderedRows'];
  columnBordered?: RanklistRenderOptionsProps['columnBordered'];
  emptyStatusPlaceholder?: RanklistRenderOptionsProps['emptyStatusPlaceholder'];
  userAvatarPlacement?: RanklistRenderOptionsProps['userAvatarPlacement'];
}

async function renderHost(props: RanklistRenderOptionsProps) {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  const appRef = await createApplication();
  const componentRef = createComponent(RenderOptionsHostComponent, {
    environmentInjector: appRef.injector,
    hostElement,
  });
  Object.assign(componentRef.instance, props);
  appRef.attachView(componentRef.hostView);
  componentRef.changeDetectorRef.detectChanges();
  return {
    container: hostElement,
    cleanup: () => {
      appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      appRef.destroy();
      hostElement.remove();
    },
  };
}

describeRanklistRenderOptionsContract({
  target: 'Angular',
  render: renderHost,
});
