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
  faMapMarkerAlt,
} from '@fortawesome/free-solid-svg-icons';


import {
  FlowBaseBlockComponent,
} from '../flow-base-block.component';

@Component({
  selector: 'app-flow-end-block',
  templateUrl: './flow-end-block.component.html',
  styleUrls: ['./flow-end-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowEndBlockComponent  extends FlowBaseBlockComponent  {
  icon = faMapMarkerAlt;
  constructor() {
    super();
  }

}