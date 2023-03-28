import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

// TODO: Importar el modelo real
interface DesignerPropertiesValues {
  [index: string] : any;
}



@Component({
  selector: 'ios-designer-block-row-fragment',
  templateUrl: './designer-block-row-fragment.component.html',
  styleUrls: ['./designer-block-row-fragment.component.css']
})
export class DesignerBlockRowFragmentComponent implements OnInit {
  /**
   * Bloque que se quiere renderizar
   */
  @Input()
  block!: DesignerPropertiesValues;
  /**
   * Row fragment que se va a mostrar
   */
  @Input()
  rowFragment = '';

  constructor() { }

  ngOnInit() {
  }

}