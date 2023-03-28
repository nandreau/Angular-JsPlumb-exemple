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


@Component({
  selector: 'app-flow-note-block',
  templateUrl: './flow-note-block.component.html',
  styleUrls: ['./flow-note-block.component.css']
})
export class FlowNoteBlockComponent extends FlowBaseBlockComponent {

  // TODO: Resolver s podemos usar esquina transparente
  //       El problema se presenta con el after/before que se desbordan del wrapper
  //       y el borde punteado queda chiquito
  constructor() {
    super();
  }

}