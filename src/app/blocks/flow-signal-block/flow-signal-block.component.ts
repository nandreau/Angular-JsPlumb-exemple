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
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'ios-flow-signal-block',
  templateUrl: './flow-signal-block.component.html',
  styleUrls: ['./flow-signal-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowSignalBlockComponent extends FlowBaseBlockComponent  {
  icon = faClipboardList;
  constructor() {
    super();
  }

}