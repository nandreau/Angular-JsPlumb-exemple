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
  EventEmitter,
  Injectable,
} from '@angular/core';


@Component({
  selector: 'ios-flow-base-block',
  template: '<div></div>',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowBaseBlockComponent {
  @Input()
  block: any;

  constructor() {}

}
