import {
  Component,
  OnInit,
  OnChanges,
  Input,
  ChangeDetectionStrategy,
  ViewContainerRef,
  ViewChild,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';

import {
  ReplaySubject,
  Observable,
  Subject,
  combineLatest,
} from 'rxjs';

import {
  takeUntil,
  tap,
} from 'rxjs/operators';

import {
  assign,
  reject,
} from 'lodash';

import {
  FlowEdge,
  FlowLayout,
} from './../models';

// TODO: Importar el modelo real
interface DesignerDocumentConfiguration {
  [index: string] : any;
}

// TODO: Importar el modelo real
interface DesignerPropertiesValues {
  [index: string] : any;
}

// TODO: Importar el modelo real
interface DesignerFlowConnection {
  [index: string] : any;
}

// TODO: Importar el modelo real
interface DesignerMapEnumerations {
  [index: string] : any;
}

// TODO: Importar el modelo real
interface DesignerBlockDefinition {
  [index: string] : any;
}

// TODO: Importar el modelo real
interface InspectorObject {
  [index: string] : any;
}


@Component({
  selector: 'ios-designer-render',
  templateUrl: './designer-render.component.html',
  styleUrls: ['./designer-render.component.css']
})
export class DesignerRenderComponent {

  @Output() move: EventEmitter<any> = new EventEmitter<any>();
  /**
   * Configuración del documento
  */
  @Input()
  configuration!: DesignerDocumentConfiguration;
  /**
   * Mapa con las enumeraciones definidas en el servidor
  */
  @Input()
  types!: DesignerMapEnumerations;
  /**
   * Lista de bloques en el documento
  */
  @Input()
  blocks!: DesignerPropertiesValues[];
  /**
   * Bloque obligatorio que se debe colocar al final de los otros bloques
   * En el caso de un imail es el footer, en el caso de iform es el botón submit
   */
  @Input()
  blockFooter!: DesignerPropertiesValues;
  /**
   * Lista de bloques disponibles
  */
  @Input()
  availablesBlocks!: {[index: string]: {type: DesignerBlockDefinition, value: DesignerPropertiesValues} };
  /**
   * Elemento seleccionado
  */
  @Input()
  selected!: InspectorObject;
  /**
   * Bandera para indicar que se debe updatear el preview
  */
  @Input()
  updatePreview = false;
  /**
   * Indica que se debe scrollear hasta mostrar un bloque
  */
  @Input()
  scrollToBlock = '';

  @Output()
  delete: EventEmitter<{block: DesignerPropertiesValues}>
          = new EventEmitter<{block: DesignerPropertiesValues}>();

  @Output()
  insert: EventEmitter<{block: DesignerPropertiesValues, index: number}>
          = new EventEmitter<{block: DesignerPropertiesValues, index: number}>();

  @Output()
  duplicate: EventEmitter<{block: DesignerPropertiesValues}>
             = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Enviar evento para Inspeccionar un bloque
   */
  @Output()
  inspectBlock: EventEmitter<{block: DesignerPropertiesValues}>
                = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Enviar evento para Inspeccionar el draft
   */
  @Output()
  inspectDraft: EventEmitter<{draft: DesignerDocumentConfiguration}>
                = new EventEmitter<{draft: DesignerDocumentConfiguration}>();
  /**
   * Enviar evento para Inspeccionar el iform
   */
  @Output()
  inspectIform: EventEmitter<{iform: DesignerDocumentConfiguration}>
                = new EventEmitter<{iform: DesignerDocumentConfiguration}>();
  /**
   * Evento para notificar cambios en propiedades del block
  */
  @Output()
  blockValuesChange: EventEmitter<{block: DesignerPropertiesValues}>
                     = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Evento para notificar cambios en propiedades del draft
  */
  @Output()
  flowValuesChange: EventEmitter<{flow: DesignerDocumentConfiguration}> = new EventEmitter<{flow: DesignerDocumentConfiguration}>();
  /**
   *  Constructor del componente
   */
  constructor() {}
  /**
   * Handler para manejar cuándo se agrega un edge
   */
  edgeAdded($event: {edge: FlowEdge}) {
    const edge = $event.edge;
    /** Buscamos los edges actuales */
    const list = this.configuration.edges;
    /** Eliminamos el edge en caso que existiera */
    const filtered = reject(list, (c) => 
        c.source.uuid === edge.source.uuid && c.source.port === edge.source.port
        && c.target.uuid === edge.target.uuid && c.target.port === edge.target.port );
    const newList = filtered.concat([edge]);
    /** calculamos la nueva configuration */
    const newConfiguration = assign({}, this.configuration, {edges : newList});
    /** Notificamos el cambio */
    this.flowValuesChange.emit({flow: newConfiguration});
  }
  /**
   * Handler para manejar cuándo se detacha un edge
   */
  edgeDetached($event: {edge: FlowEdge}) {
    const edge = $event.edge;
    /** Buscamos los edges actuales */
    const list = this.configuration.edges;
    /** Eliminamos el edge en caso que existiera */
    const filtered = reject(list, (c) => 
        c.source.uuid === edge.source.uuid && c.source.port === edge.source.port
        && c.target.uuid === edge.target.uuid && c.target.port === edge.target.port );
    /** calculamos la nueva configuration */
    const newConfiguration = assign({}, this.configuration, {edges : filtered});
    /** Notificamos el cambio */
    this.flowValuesChange.emit({flow: newConfiguration});
  }
  /**
   * Handler para manejar cuándo se detacha un edge
   */
  layoutChanged($event: {layout: FlowLayout}) {
    const change = $event.layout;
    /** calculamos el nuevo layout */
    const newLayout = assign({}, this.configuration.layout, change);
    /** calculamos la nueva configuration */
    const newConfiguration = assign({}, this.configuration, {layout: newLayout});
    /** Notificamos el cambio */
    this.flowValuesChange.emit({flow: newConfiguration});
  }
  /**
   * Handler para manejar cuándo se elimina un block
   */
  blockDeleted($event: {block: DesignerPropertiesValues}) {
    /** 
     * Para eliminar es necesario
     * - Emitir evento para borrar bloque
     * - Eliminar de layout - edges y emitir evento
     */
    const uuid = $event.block.uuid;
    const layout = {...this.configuration.layout};
    delete layout[uuid];  
    const edges = reject(this.configuration.edges, (c) =>
                                c.source.uuid === uuid || c.target.uuid === uuid);
    /** Creamos la nueva configuration sin el bloque */
    const configuration = assign({}, this.configuration, {layout: layout, edges: edges});
    /** Notificamos la eliminación del bloque */
    this.delete.emit($event);
    /** Notificamos el cambio de la configuracion */
    this.flowValuesChange.emit({flow: configuration});
  }
}