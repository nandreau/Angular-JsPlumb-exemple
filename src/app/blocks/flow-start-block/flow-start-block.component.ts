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
  faFlagCheckered,
} from '@fortawesome/free-solid-svg-icons';

import {
  FlowBaseBlockComponent,
} from '../flow-base-block.component';

@Component({
  selector: 'app-flow-start-block',
  templateUrl: './flow-start-block.component.html',
  styleUrls: ['./flow-start-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowStartBlockComponent  extends FlowBaseBlockComponent  {
  icon = faFlagCheckered;
  constructor() {
    super();
  }

}