import {
  Component,
  OnInit,
  OnChanges,
  Input,
  ChangeDetectionStrategy,
  ViewContainerRef,
  ViewChild,
  Output,
  AfterViewInit,
} from '@angular/core';

import {
  FlowBaseBlockComponent,
} from '../flow-base-block.component';

import {
  faEnvelope,
} from '@fortawesome/free-regular-svg-icons';


@Component({
  selector: 'ios-flow-action-block',
  templateUrl: './flow-action-block.component.html',
  styleUrls: ['./flow-action-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowActionBlockComponent extends FlowBaseBlockComponent {
  icon = faEnvelope;

  constructor() {
    super();
  }


}