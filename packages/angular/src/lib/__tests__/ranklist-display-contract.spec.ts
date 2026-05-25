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
import { describeRanklistDisplayContract } from '../../../../../tests/shared/ranklist-display-contract';
import type {
  RanklistDisplayAdapter,
  RanklistDisplayRenderProps,
} from '../../../../../tests/shared/ranklist-display-contract';
import { RanklistComponent } from '../index';

@Component({
  standalone: true,
  imports: [CommonModule, RanklistComponent],
  template: `
    <srk-ranklist
      [data]="data"
      [rowBordered]="rowBordered"
      [rowStriped]="rowStriped"
      [formatSrkAssetUrl]="formatSrkAssetUrl"
    />
  `,
})
class ContractHostComponent {
  data: any = {
    type: 'general',
    version: '0.3.12',
    contest: {
      title: 'Empty',
      startAt: '2026-04-23T10:00:00+08:00',
      duration: [5, 'h'],
    },
    series: [],
    markers: [],
    problems: [],
    rows: [],
  };
  rowBordered = false;
  rowStriped = false;
  formatSrkAssetUrl?: (url: string, field: string) => string;
}

interface RenderedHost {
  appRef: ApplicationRef;
  componentRef: ComponentRef<ContractHostComponent>;
  hostElement: HTMLElement;
}

async function renderHost(data: unknown, props: RanklistDisplayRenderProps = {}): Promise<RenderedHost> {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  const appRef = await createApplication();
  const componentRef = createComponent(ContractHostComponent, {
    environmentInjector: appRef.injector,
    hostElement,
  });
  Object.assign(componentRef.instance, {
    data,
    rowBordered: !!props.rowBordered,
    rowStriped: !!props.rowStriped,
    formatSrkAssetUrl: props.formatSrkAssetUrl,
  });
  appRef.attachView(componentRef.hostView);
  componentRef.changeDetectorRef.detectChanges();
  return { appRef, componentRef, hostElement };
}

const adapter: RanklistDisplayAdapter = {
  target: 'Angular',
  async render(data, props) {
    const rendered = await renderHost(data, props);
    return {
      container: rendered.hostElement,
      cleanup: () => {
        rendered.appRef.detachView(rendered.componentRef.hostView);
        rendered.componentRef.destroy();
        rendered.appRef.destroy();
        rendered.hostElement.remove();
      },
    };
  },
};

describeRanklistDisplayContract(adapter);
