import {
  ComponentRef,
  ComponentFactoryResolver,
  Injectable,
  Inject,
  ReflectiveInjector,
  Type,
} from '@angular/core';

import {
  Observable,
  Subject,
} from 'rxjs';

import {
  jsPlumb,
  Defaults,
  OverlaySpec,
  ConnectorSpec,
  ConnectionMadeEventInfo,
  Connection,
  DragOptions,
} from 'jsplumb';

import {
  uniq,
  intersection,
  map as lodashMap,
  difference,
  filter,
  find,
  assign,
  differenceBy,
  get,
  reject,
} from 'lodash';


import {
  FlowEdge,
  FlowConnectionEvent,
  FlowPortType,
  FlowConnectorTypes,
} from './models';

import {
  plumbBlockDefinitions,
} from './plumb-block-definitions';



/**
 * Valores que se usan para las conexiones
 */
const connectorDefaults: {[name: string]: ConnectorSpec} = {
  bezier: ['Bezier', {curviness: 150}],
  flowchart:  [
    "Flowchart",
    {gap: 0, cornerRadius: 5, alwaysRespectStubs: false} 
  ],
  straight: ['Straight', {}],
  'statemachine': ['StateMachine', {curviness: 5}]
}

/**
 * Flecha utilizada para overlay
 */
const arrowOverlay: OverlaySpec = ['Arrow', {
    location: 1,
    width: 15,
    length: 15,
    foldback: 0.9
    }];
/**
 *  Defaults para jsplumb
 * ver {@link http://jsplumb.github.io/jsplumb/defaults.html}
 */
const plumbDefaults: Defaults = {  
  Connector: connectorDefaults.flowchart,  
  ConnectionsDetachable: false,
  ConnectionOverlays: [
    arrowOverlay,
  ],
}
/**
 * Parámetros que se usan por defecto
 * para los targets
 */
const targetDefaultOpts = {
  isSource: false,
  isTarget: true,
  endpoint: ['Blank', {radius: 1}],
  anchor: [
    // Left
    [0, 0.5, -1, 0],
    // Right
    [1, 0.5, 1, 0],
    // Top
    [0.5, 0, 0, -1],
    // Bottom
    [0.5, 1, 0, 1],
  ],
  createEndpoint: true,
  uniqueEndpoint: false,
  deleteEndpointsOnDetach: false,
}
/**
 * Parámetros que se usan por defecto
 * para los targets
 */
const sourceDefaultOpts = {
  isSource: true,
  isTarget: false,
  endpoint: ['Dot', { radius: 7 }],
  connectorStyle: {strokeWidth: 4},
  anchor: [
    // Bottom
    [0.5, 1, 0, 1, 0, -12],
    // Left
    [0, 0.5, -1, 0, 12 ,0],
    // Right
    [1, 0.5, 1, 0, -12 ,0],
    // Top
    [0.5, 0, 0, -1, 0, 12],
  ],
  maxConnections: 1,
}


/**
 * Tiempo que dura la animación para crear/destruir una connection
 * expresada en milisegundos
 */
const ANIMATE_CONNECTION_TIME = 500;
/**
 * Algunos tips sobre jsplumbInstance:
 * 
 * Con el método getManagedElements() se obtiene la lista de elementos "manejados"
 * que es un mapa con los ids de cada "bloque"
 */

@Injectable()
export class PlumbService {
  /**
   * Stream para notificar una nueva conexión
   */
  connectionAdded$: Subject<FlowConnectionEvent> = new Subject<FlowConnectionEvent>();
  /**
   * Stream para notificar eliminación de conexión
   */
  connectionDetached$: Subject<FlowConnectionEvent> = new Subject<FlowConnectionEvent>();
  /**
   * Stream para notificar el comienzo del dragado
  */
  dragStart$: Subject<any> = new Subject<any>();
  /**
   * Stream para notificar el comienzo del dragado
  */
  dragStop$: Subject<any> = new Subject<any>();
  /**
   * Stream para manejar el cambio de posicion de un bloque
  */
  changePosition$: Subject<{blockid: string, top: number, left:number}>
                   = new Subject<{blockid: string, top: number, left:number}>();
  /** Referencia a instancia de jsplumb */
  jsPlumbInstance: any; 
  /**
   * Constructor del servicio
   */
  constructor() {
    this.jsPlumbInstance = jsPlumb.getInstance(plumbDefaults);
    /** Establecemos los bindings con los eventos */
    /** Evento para creación de connection */
    this.jsPlumbInstance.bind('connection', (info, mouseEvent) => this.handlerConnectionAdded(info, mouseEvent) );
    /** Evento para detach de connection */
    this.jsPlumbInstance.bind('connectionDetached', (info, mouseEvent) => this.handlerConnectionDetached(info, mouseEvent));
    /** Al hacer click sobre la conexión se elimina */
    this.jsPlumbInstance.bind('click', (conn) => this.handlerClickConnection(conn));
  }
  /**
   * Maneja el evento de agregar una conexión a jsplumb
   */
  private handlerConnectionAdded(info: ConnectionMadeEventInfo, mouseEvent: Event) {
    const edge = this.convertToEdge(info.connection);
    this.connectionAdded$.next({edge: edge, type: mouseEvent ? 'user' : 'programmatic'});
  }
  /**
   * Convierte una conexión de jsplumb
   * en un edge de flujo
   */
  private convertToEdge(conn): FlowEdge {
    const uuids = conn.getUuids();
    const sourcePortId = uuids[0];
    const targetPortId = uuids[1];
    return {
      source: {uuid: this.getElementId(sourcePortId), port: this.getPortType(sourcePortId)},
      target: {uuid: this.getElementId(targetPortId), port: this.getPortType(targetPortId)},
    }
  }
  /**
   * Maneja el evento de detachar una conexión en jsplumb
   */
  private handlerConnectionDetached(info: ConnectionMadeEventInfo, mouseEvent: Event) {
    const edge = this.convertToEdge(info.connection);
    /**
     * Se utiliza un timeout para eliminar realmente las conexiones
     * por tanto todas las conexiones vienen sin mouseEvent
     * pero no hay eliminaciones "programáticas"
     */
    this.connectionDetached$.next({edge: edge, type: 'user'});
  }
  /**
   * Sincroniza los elementos definidos en jsplumb
   * con una lista de bloques y conexiones
   */
  sync(blocks: any[], connections: any[]) {
    const instance = this.jsPlumbInstance;
    /** Extraemos los ids para manejarlos fácilmente */
    const newList = lodashMap(blocks, b => b.uuid);
    /** Buscamos la lista de bloques manejados por jsplumb */
    const inPlumb = lodashMap(this.jsPlumbInstance.getManagedElements(), (v, k) => k);
    /** Buscamos los bloques en plum que NO están en la lista */
    const deleteFromPlumb = difference(inPlumb, newList);
    /** Buscamos los bloques en la lista NO están en plumb */
    const addToPlumb = difference(newList, inPlumb);
    /** Convertimos la lista de ids en lista de bloques */
    const blocksToAdd = filter(blocks, b => addToPlumb.indexOf(b.uuid) > -1);
    /**
     * Suspendemos el drawing
     */
    instance.setSuspendDrawing(true);
    instance.setSuspendEvents(true);
    /** Configuramos los nuevos bloques */
    blocksToAdd.forEach(b => {
      /** Agregamos endpoints */
      this.configureBlock(b.uuid, b.class);
      /** Hacemos dragables los bloques */
      this.draggable(b.uuid);
    });
    /** Eliminamos los bloques sobrantes */
    deleteFromPlumb.forEach( b => this.removeElement(b));
    /** Agregamos connexiones */
    if (blocks && blocks.length > 0) {
      connections.forEach(conn => this.addConnection(conn));
    }
    /** Retomar el drawing */
    instance.setSuspendEvents(false);
    instance.setSuspendDrawing(false, true);
  }
  /**
   * Se encarga de repintar las conexiones y anchors
   * Se debe ejecutar cada vez que se carga nuevamente las definiciones
   */
  repaintEverything() {
    this.jsPlumbInstance.repaintEverything(true);
  }
  /**
   * Establece el contenedor en el que viven
   * los objetos administrados por Plumb
   */
  setContainer(container: HTMLElement) {
    this.jsPlumbInstance.setContainer(container);
  }
  /**
   *  Notifica a jsPlumb el nivel de zooming
   */
  setZoom(zoomLevel: number) {
    this.jsPlumbInstance.setZoom(zoomLevel);
  }
  /**
   * Cambia el tipo de connector utilizado
   * Se actualizan las conexiones creadas
   * y se cambia el valor default 
   */
  setConnectorType(type: FlowConnectorTypes) {
    // TODO: Mover estos defaults fuera a un archivo de configuration
    const newConnector = connectorDefaults[type.toLocaleLowerCase()];
    /** Establecemos el default para próximas conexiones */
    this.jsPlumbInstance.importDefaults({Connector: newConnector});
    /** Obtenemos las conexiones actuales */
    const connections = this.jsPlumbInstance.select();
    /** Recorremos las conexiones para hacer el cambio */
    connections.each( c => {
      /** Quitamos la clase que anima la conexión */
      c.removeClass('programatic-connector');
      /** Agregamos la marca que anima la eliminación */
      c.addClass('connection-marked-for-delete');
      /** Estalecemos los parámetros de animación para eliminarla */
      this.setAnimationStyle(c);
      /** Esperamos que se cumpla el tiempo de animación para expandirlas */
      setTimeout( () => {
        /** Quitamos la clase que anima la eliminacion */
        c.removeClass('connection-marked-for-delete');
        /** Agregamos la clase que anima el crecimiento */
        c.addClass('programatic-connector')
        /** Cambiamos el tipo de conector */
        c.setConnector(newConnector);
        /** agregamos la flecha */
        c.addOverlay(arrowOverlay)
        /** Estalecemos los parámetros de animación para expandirla */
        this.setAnimationStyle(c);
      }, ANIMATE_CONNECTION_TIME);
    });
  }
  /**
   * Agrega una conexión
   */
  private addConnection($event: FlowEdge) {
    const connected = this.jsPlumbInstance.select();
    const sourcePortId = this.getPortUuid($event.source.uuid, $event.source.port); 
    const targetPortId = this.getPortUuid($event.target.uuid, $event.target.port); 
    let exist = false;
    connected.each( conn => {
      const uuids = conn.getUuids();
      if (uuids[0] === sourcePortId && uuids[1] === targetPortId ) {
        exist = true;
      }
    })
    if (exist) { return; }
    /**
     * Buscamos si existe algún target que no tenga creado sus endpoints
     * Esto se hace para poder usar el connect por uuids
     * que requiere que los endpoints estén creados
    */
    /** Extraemos el elementId del puertoId del target */    
    const elementTarget = $event.target.uuid;
    /** Buscamos la definición para el endpoint */
    const managed = get(this.jsPlumbInstance.targetEndpointDefinitions, elementTarget + '.default.def', null);
    if (managed && managed.createEndpoint === false) {
      this.jsPlumbInstance.addEndpoint(elementTarget, managed);
    }
    /** Si llegamos hasta aqui la conexion no existe y se agrega */
    const conn = this.jsPlumbInstance.connect({uuids: [sourcePortId, targetPortId], cssClass: 'programatic-connector'});
    /** Asignamos los estilos para animar la conexion */
    this.setAnimationStyle(conn);
  }
  /**
   * Elimina una conexión pero primero agrega una clase
   * y espera unos ms para que se anime la eliminación
   */
  private handlerClickConnection(conn: any) {
    /** Asignamos los estilos para que se pueda animar*/
    this.setAnimationStyle(conn);    
    conn.addClass('connection-marked-for-delete');
    /** Esperemos que e ejecute la animación */
    setTimeout( () => this.jsPlumbInstance.deleteConnection(conn), ANIMATE_CONNECTION_TIME);
  }
  /**
   *  Asigna los estilos para que se pueda animar el path
   */
  private setAnimationStyle(conn: any) {
    if (!conn) { return; }
    /**
     * Hacemos un timeout para garantizar 
     * los path ya estén creados en el DOM
     */
    setTimeout( () => {
      /** Obtenemos el conector */
      const connector = conn.getConnector();
      /** Si no obtenemos el connector, salimos */
      if (!connector) { return; }
      /** Obtenemos el lenth redondeado */
      const len = Math.round(connector.getLength());
      /** Obtenemos el elemento svg path */
      const path = connector.path;
      /** Propiedades para animar el path */
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.animationDuration = ANIMATE_CONNECTION_TIME + 'ms';
    })
  }
  /**
   * Hace que un elemento sea draggable
   * en un grid de 10x10
   * y que emita un evento en cada cambio de posición
   */
  private draggable(elementId: string, optionsUser?: DragOptions) {
    const optionsDefault = {
      grid: [10, 10],
      containment: true,
      stop: (event => this.changePosition$.next({
                  blockid: elementId,
                  left: event.finalPos[0],
                  top: event.finalPos[1]
      }))
    };
    const options = {...optionsDefault, ...optionsUser};
    this.jsPlumbInstance.draggable(elementId, options);
  }
  /**
   * Se encarga de configurar un bloque para plumb
   */
  private configureBlock(elementId: string, blockClass: string) {
    /** Verificamos si ya está configurado */
    if (this.isBlockManaged(elementId)) { return; }
    /** Buscamos el tipo de bloque */
    const blockType = this.getBlockType(blockClass);
    /** Cargamos la definición de plumb para este tipo de bloques */
    const plumbDefinition = this.getBlockPlumbing(elementId, blockType);
    if (!plumbDefinition) {
      console.log('Definition not found for type:', blockClass);
      return;
    }
    /** Hacemos el objeto Target */
    this.jsPlumbInstance.makeTarget(elementId, plumbDefinition.target, targetDefaultOpts);
    /** Agregamos los endpoints */
    plumbDefinition.endpoints.forEach( (pt) => {
      this.jsPlumbInstance.addEndpoint(elementId, pt, sourceDefaultOpts);
    });
  }
  /**
   * Verifica si un blockId ya está configurado en jsplumb
   */
  private isBlockManaged(elementId: string): boolean {
    /** Verificamos si ya está configurado */
    const configured = this.jsPlumbInstance.selectEndpoints();
    let blockReady = false;
    configured.each((pt) => {
      if (pt.elementId === elementId) { return true;}
    });
    return false;
  }
  /**
   * Busca configuración del plumbing de un bloque
   */
  private getBlockPlumbing(elementId: string, blockType: string): {target: any, endpoints: any[]} {
    /** Buscamos la definición del Plumb para este bloque  */
    const definition = find(plumbBlockDefinitions.blocks, d => d.type === blockType);
    const allowedConnections = plumbBlockDefinitions.allowed;
    if (!definition) {
      console.warn('Block plumbing definition not found for type ' + blockType);
      return;
    }
    /**
     * Calculamos el targetDefinition
     */
    /** Calculamos el scope para el target */
    const scope = this.getTargetScope(blockType, definition.target.port, allowedConnections);
    /** Calculamos el id del puerto */
    const uuid = this.getPortUuid(elementId, definition.target.port);
    /** Calculamos la clase que se le agrega */
    const cssClass = this.calculateCssClass(blockType, definition.target.port);
    /** Construimos la definición completa */
    const target = assign({}, definition.target.plumb, {uuid, scope});
    /**
     * Calculamos los endpoints
     */
    const endpoints = lodashMap(definition.endpoints, pt => {
      /** Calculamos el id del puerto */
      const uuid = this.getPortUuid(elementId, pt.port);
      /** Calculamos el scope para los endpoints */
      const scope = this.getSourceScope(blockType, pt.port, allowedConnections);
      /** Manejamos los eventos de dragado para las conexiones */
      const dragOptions = {
        start: (event) => this.connectionDragStart(event, elementId, scope),
        stop: (event) => this.connectionDragStop(event),
      };
      /** Calculamos la clase que se le agrega */
      const cssClass = this.calculateCssClass(blockType, pt.port);
      return assign({}, pt.plumb, {uuid, dragOptions, scope, cssClass});
    })
    /** Devolvemos la configuración completa */
    return {target, endpoints};
  }
  /**
   * Calcula el scope de Target utilizado para un tipo dado
   */
  private getTargetScope(blockType: string, port: string, allowed): string {
    /** Filtramos todos los permitidos que tienen como target el solicitado */
    const filtered = filter(allowed, e => e.target.type === blockType && e.target.port === port);
    const scopes = lodashMap(filtered, e => 
                             e.source.type + '.' + e.source.port + '->' + e.target.type + '.' + e.target.port);
    return scopes.join(' ');
  }
  /**
   * Calcula el scope de Source utilizado para un tipo dado
   */
  private getSourceScope(blockType: string, port: string, allowed): string {
    /** Filtramos todos los permitidos que tienen como target el solicitado */
    const filtered = filter(allowed, e => e.source.type === blockType && e.source.port === port);
    const scopes = lodashMap(filtered, e => 
                             e.source.type + '.' + e.source.port + '->' + e.target.type + '.' + e.target.port);
    return scopes.join(' ');
  }
  /**
   * Calcula el uuid para un puerto
   */
  private getPortUuid(elementId: string, port: string): string {
    return elementId + '.' + port;
  }
  /**
   * Extrae el elementId desde un puerto id
   */
  private getElementId(portId: string): string {
    return portId.split('.')[0];;
  }
  /**
   * Extrae el tipo de puerto desde un puerto id
   */
  private getPortType(portId: string): FlowPortType {
    const splited = portId.split('.');
    if (splited.length === 0) { return FlowPortType.invalid;}
    return splited[1] as FlowPortType;
  }


  /**
   * Calcula la clase para endpoint y target
   */
  private calculateCssClass(blockType: string, portName: string): string {
    return 'endpoint-' + blockType + '-' + portName;
  }
  // TODO: Eliminar duplicación con función en flow-validators
  /**
   * Obtiene el tipo de bloque a partir de los datos del bloque
   */
  private getBlockType(blockClass: string): string {
    const defaultType = 'default';
    /**
     * El tipo se extrae de la clase
     * flow.type.otros.valores
     */
    const pattern = /flow\.(.+)(\..*)?/;
    const matches = blockClass.match(pattern);
    /** Verificamos los resultados */
    if (!matches || matches.length === 0) { return defaultType;}
    return matches[1];
  }
  /**
   * Handler para el comienzo de dragado de una conexión
   * Calcula cuáles bloques están "abiertos" / "cerrados"
   * para recibir esa potencial conexión
   * 
   * Se utiliza para resaltar los bloques disponibles
   */
  private connectionDragStart(event: any, sourceId: string, sourceScopes: string) {
    /** Buscamos la lista de todos los endpoints declarados */
    const endpoints = this.jsPlumbInstance.selectEndpoints();
    /** Los convertimos en un arreglo únicamente con los targets*/
    let allBlocks = [];
    endpoints.each( pt => {
      if (pt.isTarget && pt.elementId !== sourceId) {
        allBlocks.push({isFull: pt.isFull(), scopes: pt.scope ? pt.scope.split(' ') : '', elementId: pt.elementId});
      }
    });
    /** Buscmaos los endpoints definidos en los targets para crearse en demanda */
    const deferred = this.extractTargetsWithDeferredEndpoint();
    /** Excluimos el sourceId de los deferred */
    const deferredFiltered = reject(deferred, ['elementId', sourceId]);
    /** Extraemos los que todavía no tenga creado el endpoint */
    const pendings = differenceBy(deferredFiltered, allBlocks, 'elementId');
    /** Los agregamos a la lista de todos los bloques */
    allBlocks = allBlocks.concat(pendings);
    /** Separamos los que están abiertos y los cerrados */
    const open = allBlocks.filter( (block) =>
                          !block.isFull && intersection(sourceScopes.split(' '), block.scopes).length > 0 );
    const closed = allBlocks.filter( (block) =>
                          block.isFull || intersection(sourceScopes.split(' '), block.scopes).length === 0 );
    /** Extraemos los ids */
    const openIds = open.map(b => b.elementId);
    const closedIds = closed.map(b => b.elementId);
    /** Notificamos el evento */
    this.dragStart$.next({open: uniq(openIds), closed: uniq(closedIds)});
  }
  /**
   * Extraer los targets que tienen definidos los endpoints
   * para que no se creen al momento de crear el target
   */
  private extractTargetsWithDeferredEndpoint() {
    /** Buscamos los targets definidos */
    const targets = this.jsPlumbInstance.targetEndpointDefinitions;
    /** Convertimos la información */
    const potentials = lodashMap(targets, (v, k) => {
      const scopes = v.default.def.scope ?  v.default.def.scope.split(' ') : '';
      return {
        elementId: k,
        scopes: scopes,
        createEndpoint: v.default.def.createEndpoint,
        isFull: v.default.maxConnections !== -1,
        uuid: v.default.def.uuid
      }
    });
    /** Retornamos los targets que no se crean el endpoint al principio */
    return filter(potentials, v => !v.createEndpoint);
  }
  /**
   * Handler para el fin de dragado de una conexión
   */
  private connectionDragStop(event: any) {
    this.dragStop$.next(event);
  }
  /**
   * Implementación de remove que NO elimina
   * el objeto del DOM.
   * Esto lo hice para permitir que el objeto sea 
   * removido por angular y se puedan tener animaciones
   * 
   * La función de remove en jsplumb
   * siempre elimina del DOM y eso crea un problema con angular
   * ya que se borra inmediatamente sin esperar la animación
   * 
   * Traté de hacer todos los pasos que están en el código original para remove
   * https://github.com/jsplumb/jsplumb/blob/master/src/jsplumb.js#L2824
   */
  private removeElement(elementId: string) {
    const instance = this.jsPlumbInstance;
    /** Eliminamos los endpoints y conexiones */
    instance.removeAllEndpoints(elementId, true, []);
    /**
     * Remover el elemento del drag manager
     * https://github.com/jsplumb/jsplumb/issues/130
     */
    const dragManager = instance.getDragManager();
    dragManager.elementRemoved(elementId);
    /** Eliminamos el manejo de anchors asociados */
    //instance.anchorManager.clearFor(elementId);
    //instance.anchorManager.removeFloatingConnection(elementId);
    /** Deshacemos los target o sources que tenga */
    if (instance.isSource(elementId)) {
        instance.unmakeSource(elementId);
    }
    if (instance.isTarget(elementId)) {
        instance.unmakeTarget(elementId);
    }
    //instance.destroyDraggable(elementId);
    instance.destroyDroppable(elementId);
    delete instance.floatingConnections[elementId];
    /**
     * Eliminamos el elemento de la lista de elementos
     * manejados por jsplumb
     * https://github.com/jsplumb/jsplumb/issues/815
     */
    delete instance.getManagedElements()[elementId]
  }
}
