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
  faStopwatch,
} from '@fortawesome/free-solid-svg-icons';

import {
  FlowBaseBlockComponent,
} from '../flow-base-block.component';

@Component({
  selector: 'ios-flow-node-block',
  templateUrl: './flow-node-block.component.html',
  styleUrls: ['./flow-node-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowNodeBlockComponent extends FlowBaseBlockComponent {
  icon = faStopwatch;
  
  constructor() {
    super();
  }


}