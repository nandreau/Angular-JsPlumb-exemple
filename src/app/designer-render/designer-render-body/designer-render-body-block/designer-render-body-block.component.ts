import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  Type,
  ViewChild,
  ViewContainerRef,
  OnInit,
  HostBinding,
} from '@angular/core';


import {
  Subject,
  Observable,
  combineLatest,
} from 'rxjs';

import {
  map,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { BlockStoreService } from '../../../block-store.service';

import {
  PlumbService,
} from '../../../plumb.service';

// TODO: Importar el modelo real
interface DesignerPropertiesValues {
  [index: string] : any;
}

@Component({
  selector: 'ios-designer-render-body-block',
  templateUrl: './designer-render-body-block.component.html',
  styleUrls: ['./designer-render-body-block.component.css']
})
export class DesignerRenderBodyBlockComponent implements OnInit {
  @Input() blockDefinition: any;
  /**
   * Subject para manejar destrucción del objeto
  */
  componentDestroyed$: Subject<void> = new Subject<void>();
  /**
   * Stream para reportar la inicialización
  */
  initialized$: Subject<boolean> = new Subject<boolean>();
  /**
   * Stream para que llegó un nuevo bloque
  */
  newBlock$: Subject<DesignerPropertiesValues> = new Subject<DesignerPropertiesValues>();
  /**
   * Stream para notificar que llegó un nuevo layout
  */
  newLayout$: Subject<any> = new Subject<any>();
  /**
   * Stream para crear el objeto a renderizar
  */
  render$:  Observable<DesignerPropertiesValues>;
  /**
   * Bloque que se quiere renderizar
   */
  block!: DesignerPropertiesValues;
  /**
   * Layout del bloque
   */
  layout!: {top: number, left: number, height: number, width: number};
  /**
   * Componente utilizado para mostrar el bloque
  */
  blockComponent!: Type<any>;
  /**
   * Posición superior del host
   */
  @HostBinding('style.top.px')
  get top() {
    return this.layout ? this.layout.top : 0;
  }
  /**
   * Posición izquierda del host
   */
  @HostBinding('style.left.px')
  get left() {
    return this.layout ? this.layout.left : 0;
  }
  /**
   * Id del host
   */
  @HostBinding('id')
  get hostId() {
    return this.block ? this.block.uuid : '';
  }
  /**
   * Clases que se asocian al host
   */
  @HostBinding('class')
  get class() {
    const classes = [];
    if (this.focused) { classes.push('block-focused')};
    if (this.openForConnection) { classes.push('open-for-connection')};
    if (this.closedForConnection) { classes.push('closed-for-connection')};
    return classes.join(' ').trim();
  }


  /**
   * Bloque para renderizar
  */
  @Input('block')
  set blockContent(block: DesignerPropertiesValues) {
    /** Almacenamos el bloque para usarlo en el template */
    this.block = block;
    /** Notificamos que ya tenemos el bloque asignado */
    this.newBlock$.next(block);
  }
  /**
   * Layout del bloque para renderizar
  */
  @Input('layout')
  set layoutContent(layout: any) {
    /** Almacenamos el bloque para usarlo en el template */
    this.layout = layout;
    /** Notificamos que ya tenemos el bloque asignado */
    this.newLayout$.next(layout);
  }
  /**
   * Bandera para indicar si está "abierto"
   * para recibir una conexión
   * Se enciende cuándo se hace dragado de la conexión
  */
  @Input()
  openForConnection = false;
  /**
   * Bandera para indicar si está "cerrado"
   * para recibir una conexión
   * Se enciende cuándo se hace dragado de la conexión
  */
  @Input()
  closedForConnection = false;
  /**
   * Bandera para indicar si debe resaltarse
   * Se utiliza para mostrar bloques que tienen
   * alguna condición de error
  */
  @Input()
  focused = false;
  /**
   * Nodo dónde insertamos el componente
   */
  @ViewChild('canvas', {read: ViewContainerRef, static: true})
  canvas!: ViewContainerRef;
  /**
   * Enviar evento para eliminar un bloque
   */
  @Output()
  delete: EventEmitter<{block: DesignerPropertiesValues}> = new EventEmitter<{block: DesignerPropertiesValues}>();


  constructor(private blockStore: BlockStoreService,
              private componentFactory: ComponentFactoryResolver,
              private changeDetectorRef: ChangeDetectorRef) {
    /** Stream para insertar el bloque en el canvas */
    this.render$ = combineLatest(this.initialized$, this.newBlock$, this.newLayout$)
      .pipe(
        takeUntil(this.componentDestroyed$),
        tap( ([initialized, block, layout]) => {
          /** Extraemos la clase del block */
          this.blockComponent = this.blockStore.getComponent(block.class);
          /** Creamos el factory para el componente */
          const factory = this.componentFactory.resolveComponentFactory(this.blockComponent);
          /** Obtenemos referencia al contenedor del objeto block */
          const canvas = this.canvas;
          /** Limpiamos la vista previa para evitar que se "sume" a la del componente */
          canvas.clear();
          /** Creamos el componente */
          const componentRef = canvas.createComponent(factory);
          /** Asignamos el bloque */
          componentRef.instance.block = block;
          /** Actualizamos la vista para que se tome el cambio de datos */
          this.changeDetectorRef.detectChanges();
        }),
        map ( ([render, block]) => block),
      );
    /** Nos suscribimos al stream */
    this.render$.subscribe();

              
  }

  ngOnInit() {
    this.initialized$.next(null);
  }
  // TODO: Implementar el método real de clickToolbar
  //       Aqui solo quería simular el eliminar
  clickToolbar(event) {
    this.delete.emit({block: this.block});
  }


}