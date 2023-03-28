import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  Type,
  AfterViewInit,
  ViewChild,
  ViewChildren,
  ElementRef,
  ViewEncapsulation,
  QueryList,
} from '@angular/core';


import {
  ReplaySubject,
  Observable,
  Subject,
  zip,
} from 'rxjs';

import {
  takeUntil,
  tap,
  map,
  filter,
  combineLatest,
  share,
  withLatestFrom,
  distinctUntilChanged,
} from 'rxjs/operators';

import {
  assign,
  reject,
  find,
} from 'lodash';

/** Animación para mostrar los bloques */

import {
  pulseListItem,
} from '../../shared/animations';

/** Servicio para manejar los conectores */
import {
  PlumbService
} from '../../plumb.service';

/** Servicio para manejar los themes */
import {
  ThemeManagerService
} from '../../theme-manager.service';


// TODO: Importar el modelo real
import {
  DesignerDocumentConfiguration,
  FlowEdge,
  FlowLayout,
  FlowConnectorTypes,
} from '../../models';


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

/**
 * Importar lista de themes
 */
import {
  listThemesFlow,
} from '../../themes/list-themes-flow';

@Component({
  selector: 'ios-designer-render-body',
  templateUrl: './designer-render-body.component.html',
  styleUrls: ['./designer-render-body.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [ pulseListItem ]
})
export class DesignerRenderBodyComponent implements OnDestroy, AfterViewInit {
  @Input() blockDefinition: any;
  /**
   * Subject para manejar destrucción del objeto
  */
  componentDestroyed$: Subject<void> = new Subject<void>();
  /**
   * Stream con los cambios en la data que genera un nuevo renderizado
   */
  renderValueChanges$!: Observable<any>;
  /**
   * Stream con cambios en la lista de nodos
   */
  blocks$: ReplaySubject<DesignerPropertiesValues> = new ReplaySubject<DesignerPropertiesValues>(1);
  /**
   * Stream con cambios en el catálogo
   */
  catalog$: ReplaySubject<{[x: string]: {type: DesignerBlockDefinition, value: DesignerPropertiesValues} }>
            = new ReplaySubject<{[x: string]: {type: DesignerBlockDefinition, value: DesignerPropertiesValues} }>(1);
  /**
   * Stream para notificar init del componente
   */
  init$: ReplaySubject<void> = new ReplaySubject<void>(1);
  /**
   * Stream para notificar nuevos edges
   */
  edges$: ReplaySubject<FlowEdge[]> = new ReplaySubject<FlowEdge[]>(1);
  /**
   * Stream para notificar nuevos layout
   */
  layout$: ReplaySubject<FlowLayout[]> = new ReplaySubject<FlowLayout[]>(1);
  /**
   * Stream para notificar nuevos blocks que se deben "enfocar"
   */
  focused$: ReplaySubject<string[]> = new ReplaySubject<string[]>(1);
  /**
   * Copia local de los blocks
   */
  blocks: DesignerPropertiesValues[] = [];
  /**
   * Lista de bloqueIds que están "abiertos" para dropear una conexión
   */
  openForDrop: string[] = [];
  /**
   * Lista de bloqueIds que están "cerrados" para dropear una conexión
   */
  closedForDrop: string[] = [];
  /**
   * Propiedades del theme aplicado actualmente
   */
  themeProperties = '';
  /**
   * Nivel de zoom utilizado
   */
  zoom = 1;

  /**
   * Edges en el flujo
  */
  @Input()
  set edges(newEdges: FlowEdge[]) {
    console.log('llegaron nuevos edges-->', newEdges);
    this.edges$.next(newEdges);
  }
  /**
   * Bloque que se deben resaltar en el flujo
  */
  @Input()
  set focused(list: string[]) {
    console.log('llegaron nuevos focused-->', list);
    this.focused$.next(list);
  }  
  /**
   * Mapa con las enumeraciones definidas en el servidor
  */
  @Input()
  types!: DesignerMapEnumerations;
  /**
   * Lista de bloques en el documento
  */
  @Input('blocks')
  set blocksValue(list: DesignerPropertiesValues[]) {
    this.blocks$.next(list);
    this.blocks = list;
  }
  /**
   * Lista de bloques disponibles
  */
  @Input()
  set availablesBlocks(list: {[x: string]: {type: DesignerBlockDefinition, value: DesignerPropertiesValues} }) {
    this.catalog$.next(list);
  }
  /**
   * Elemento seleccionado
  */
  @Input()
  selected!: InspectorObject;
  /**
   * Theme utilizado en el canvas
  */
  @Input()
  set themeCss(theme: string) {
    /** Obtenemos las propiedades del nuevo theme */
    const properties = this.themeSrv.getThemeProperties(theme);
    /** Asignamos las propiedades en el template */
    this.themeProperties = properties;
  }
  /**
   * Nivel de zoom para mostrar el canvas
  */
  @Input('zoom')
  set zoomValue(value: number) {
    this.zoom = value;
    this.plumbSrv.setZoom(value);
  };
  /**
   * Tipo de conector para usar en jsplumb
  */
  @Input()
  set connectorType(connector: FlowConnectorTypes) {
    if (!connector) { return; }
    this.plumbSrv.setConnectorType(connector)  
  }
  /**
   * Layout para mostrar los bloques
  */
  @Input()
  set layout(newLayouts: FlowLayout[]) {
    this.layout$.next(newLayouts);
  }

  /**
   * Referencia al lienzo del jsPlumb
   */
  @ViewChild('plumbCanvas', {read: ElementRef, static: true})
  plumbCanvas!: ElementRef;
  /**
   * Referencia a la lista de bloques
   * se utiliza para notificar a plumb
   * cuando cambia la lista en el DOM
   */
  @ViewChildren('blockList')
  blockList!: QueryList<any>;
  /**
   * Enviar evento para eliminar un bloque
   */
  @Output()
  delete: EventEmitter<{block: DesignerPropertiesValues}> = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Enviar evento para Draggear un bloque
   */
  @Output()
  insert: EventEmitter<{block: DesignerPropertiesValues, index: number}> =
                    new EventEmitter<{block: DesignerPropertiesValues, index: number}>();
  /**
   * Enviar evento para Duplicar un bloque
   */
  @Output()
  duplicate: EventEmitter<{block: DesignerPropertiesValues}> = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Enviar evento para Mover un bloque
   */
  @Output()
  move: EventEmitter<{block: DesignerPropertiesValues, destination: number}> =
                    new EventEmitter<{block: DesignerPropertiesValues, destination: number}>();
  /**
   * Enviar evento para Inspeccionar un bloque
   */
  @Output()
  inspectBlock: EventEmitter<{block: DesignerPropertiesValues}> = new EventEmitter<{block: DesignerPropertiesValues}>();
  /**
   * Evento para notificar cambios en edges
  */
  @Output()
  edgeAdded: EventEmitter<{edge: FlowEdge}> = new EventEmitter<{edge: FlowEdge}>();
  /**
   * Evento para notificar cambios en edges
  */
  @Output()
  edgeDetached: EventEmitter<{edge: FlowEdge}> = new EventEmitter<{edge: FlowEdge}>();
  /**
   * Evento para notificar cambios en el layout
  */
  @Output()
  layoutChanged: EventEmitter<{layout: FlowLayout}> = new EventEmitter<{layout: FlowLayout}>();
  /**
   * Constructor del componente
   */
  constructor(private plumbSrv: PlumbService, 
              private changeDetectorRef: ChangeDetectorRef,
              private themeSrv: ThemeManagerService) {
    /**
     * Stream para redibujar bloques en el template
     * La suscripción se realiza en el template con async
     */
    this.renderValueChanges$ = this.init$
      .pipe(
        tap( () => {
          /** Establecemos el elemento que contiene al plumbing */
          this.plumbSrv.setContainer(this.plumbCanvas.nativeElement);
        }),
        combineLatest(this.blocks$, this.edges$, this.layout$, this.focused$),
        map( ([init, blocks, edges, layout, focused ]) => ({
          blocks : blocks, layout: layout, edges: edges, focused: focused
        })),
      );
    /**
     * Stream para resincronizar cambios en edges o layout
     */
    const repaint$ = this.init$
      .pipe(
        takeUntil(this.componentDestroyed$),
        combineLatest(this.edges$, this.layout$),
        tap( ([init, edges, layout]) => {
          setTimeout( () => {
            this.plumbSrv.sync(this.blocks, edges);
          });
        }),
      )
      .subscribe();
    
    /**
     * Nos suscribimos a los eventos de dragado de la conexión
     * se utilizan para calcular los bloques
     * disponibles (abiertos y cerrados) para la conexión
     */
    /* Comienzo del dragado de conexión */
    const dragStart$ = this.plumbSrv.dragStart$
      .pipe(
        takeUntil(this.componentDestroyed$),
        tap( (list) => {
          this.openForDrop = list.open;
          this.closedForDrop = list.closed;
        }),
        tap( () => this.changeDetectorRef.markForCheck()),
      )
      .subscribe();
    /* Fin del dragado de conexión */
    const dragStop$ = this.plumbSrv.dragStop$
      .pipe(
        takeUntil(this.componentDestroyed$),
        tap( () => {
          this.openForDrop = [];
          this.closedForDrop = [];
        }),
        tap( () => this.changeDetectorRef.markForCheck()),
      )
      .subscribe();
    /** Nos suscribimos al evento de nueva conexiones */
    const connectionAdded$ = this.plumbSrv.connectionAdded$
      .pipe(
        takeUntil(this.componentDestroyed$),
        filter(event => event.type === 'user'),
        map(event => event.edge),
        tap(configuration => this.edgeAdded.emit({edge: configuration}))
      )
      .subscribe();
    /** Nos suscribimos al evento de eliminación de conexión */
    const connectionDetached$ = this.plumbSrv.connectionDetached$
      .pipe(
        takeUntil(this.componentDestroyed$),
        filter(event => event.type === 'user'),
        map(event => event.edge),
        tap(configuration => this.edgeDetached.emit({edge: configuration}))
      )
      .subscribe();
    /** Nos suscribimos al evento de cambio de posición en un bloque */
    const changePosition$ = this.plumbSrv.changePosition$
      .pipe(
        takeUntil(this.componentDestroyed$),
        map(event => ({[event.blockid]: {top: event.top, left: event.left}})),
        tap(layout => this.layoutChanged.emit({layout: layout}))
      )
      .subscribe();
  }

  /**
   * Elimina un bloque del flujo
   */
  deleteBlock($event) {
    /** Notificamos la eliminación del bloque */
    this.delete.emit($event);
  }
  /**
   * Devuelve el id de un bloque
   * Utilizada desde el template para el trackBy
   * de la lista de bloques
   */
  getBlockId(index: number, item: DesignerPropertiesValues): string {
    return item.uuid;
  }
  /**
   * Handler para el evento de inicialización de la vista
   */
  ngAfterViewInit() {
    /** Notificamos que se inicializó */
    this.init$.next(null);
    /**
     * Nos suscribimos a los cambios en la lista de bloques
     * ViewChildren sólo está disponible
     * cuando se inicializa la vista
     * 
     * Sólo se sincroniza con jsPlumb cuándo
     * se cambia la lista de bloques
     * 
     */
    const readyToPlumb$ = this.blockList.changes
      .pipe(
        takeUntil(this.componentDestroyed$),
        withLatestFrom(this.renderValueChanges$),
        map(([queryList, combo]) => combo),
        filter(combo => combo && combo.blocks),
        tap(combo => {
          this.plumbSrv.sync(combo.blocks, combo.edges);
        })
      )    
      .subscribe();
  }  
  /**
   * Destructor del componente
   * Completa el stream para notificar que se está destruyendo
   */
  ngOnDestroy() {
    /** Stream para notificar destrucción del componente */
    this.componentDestroyed$.next();
    this.componentDestroyed$.complete();
  }    
}