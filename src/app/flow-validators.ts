import {
  assign,
  countBy,
  map,
  filter,
  differenceBy,
  some,
  has,
  each,
  concat,
  compact,
  find,
  flatten,
  every,
  pickBy,
  mapValues,
  uniq,
  reverse,
  findIndex,
  reduce,
} from 'lodash';

import {
  Graph,
  alg as graphAlgorithms,
  json as graphJson,
} from '@dagrejs/graphlib';

import {
  plumbBlockDefinitions,
} from './plumb-block-definitions';

// TODO: Importar modelo real
interface DesignerPropertiesValues {
  [index: string] : any;
}

// TODO: Importar modelo desde angular
interface ValidationErrors {
  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  data: any;
}

import {
  FlowEdge,
} from './models';

/**
 * Representa un edge en graphlib
 */
interface GraphEdge {
  v: string,
  w: string,
}

/**
 * Enumeración con el orden en que se puede buscar los paths de un nodo
 */
enum OrderPath {
  /** Se buscan los hijos de un nodo */
  FORWARD = 'forward',
  /** Se buscan los padres de un nodo */
  BACKWARD = 'backward'
}

/**
 * Esta librería se encarga de validar un flujo
 * 
 */
export const validateFlow = (blocks: DesignerPropertiesValues, edges: any[]): ValidationErrors | null => {
  /** Convertimos los bloques y edges en un graph */
  const g = buildGraph(blocks, edges);
  /** Construimos el objeto con las validaciones */
  const validations: ValidationErrors | null = {
      minimunBlocks:        validateMinimunBlocks(g),
      uniqueComponent:      validateUniqueComponent(g),
      acyclic:              validateAcyclic(g),
      uniqueEntryNode:      validateUniqueEntryNode(g),
      connections:          validateConnections(g),
      nodeInEveryRoute:     validateNodeInEveryRoute(g),
      validSources:         validateSources(g),
      validSinks:           validateSinks(g),
      expiration:           validateExpiration(g),
  };
  /** Filtramos los que tienen valid = false */
  const errors = pickBy(validations, v => !v.valid);
  /** Retornamos el mapa de errores y la data */
  return mapValues(errors, v => v.data);
}
/**
 * Función para devolver todos los paths de un flujo
 */
export const getAllPaths = (blocks: DesignerPropertiesValues, edges: any[]) => {
  /** Convertimos los bloques y edges en un graph */
  const g = buildGraph(blocks, edges);
  /** Buscamos todos los sources */
  const sources = g.sources();
  /** Buscamos los paths para cada source y los flateamos */
  const paths = flatten(map(sources, b => extractPaths(g, b, OrderPath.FORWARD)));
  return paths;
}
/**
 * Expresa el flujo como una lista de checkpoints
 */
export const getCheckpointCentric = (blocks: DesignerPropertiesValues, edges: any[]) => {
  /** Convertimos los bloques y edges en un graph */
  const graph = buildGraph(blocks, edges);
  /** Buscamos los paths que tienen como orígen un node */
  const paths = getPathsFromNodes(graph);
  /** En cada path llegamos solamente hasta el próximo block del type=node */
  const pathsCleaned = map(paths, path => filterUntilNextNode(path));
  /** Identificamos cada path con el nodo del que parte */
  const clustered = map(pathsCleaned, path => ({block: path[0].block, port: path[0].edge.split('-')[0], path: path.slice(1)}));
  /** Creamos la estructura con {nodo:{port{[paths]}}} */
  const reduced = reduce(clustered, (acum, v) => {
    if (!acum[v.block]) { acum[v.block] = {}; }
    if (!acum[v.block][v.port]) { acum[v.block][v.port] = []; }
    /** Extraemos únicamente el id del bloque */
    const pathSimplified = map(v.path, b => b.block);
    /** Agregamos el path al puerto correspoindiente */
    acum[v.block][v.port].push(pathSimplified);
    return acum;
  }, {});    
  /** Calculamos las rutas que llegan al primer node */
  /** Buscamos el primer block del tipo node */    
  const firstNode = getFirstNode(graph);
  /** Extraemos los paths que llegan hasta el node */
  const entryPaths = getPathsToTarget(graph, firstNode);
  /** Extraemos sólo el id del bloque */
  const entrySimplified = map(entryPaths, p => p = map(p, b => b.block));
  /** Agregamos  el puerto de entrada al primer node*/
  reduced[firstNode].in = entrySimplified;
  /** Retornamos el mapa de nodes */
  return reduced;
}
/**
 * Devuelve todos los paths que salen de un block de tipo=node
 */
const getPathsFromNodes = (g: Graph) => {
  /** Buscamos todos los sources */
  const all = g.nodes();
  /** Filtramos sólo los del type node */
  const checkpoints = filter(all, b => g.node(b) === 'node');
  /** Buscamos los paths para cada checkopoint y los flateamos */
  const paths = flatten(map(checkpoints, b => extractPaths(g, b, OrderPath.FORWARD)));
  return paths;
}
/**
 * Retorna el primer node de entrada
 */
const getFirstNode = (g: Graph) => {
  /** Extraemos los nodos del graph */
  const all = g.nodes();
  /** Agregamos los tipos */
  const types = map(all, b => ({block: b, type: g.node(b)}));
  /** Filtramos sólo los de tipo start */
  const starts = filter(types, b => b.type === 'start' );
  /** Agregamos el tipo y colocamos el orden */
  const routes = map(starts, b => ({block: b.block, paths: extractPaths(g, b.block)}));
  /** Validamos que todos los paths conduzcan al mismo node */
  const nodes = map(routes, b => ({block: b.block, firstNode: map(b.paths, p => extractFirstNode(p))}));
  /** Aplanamos los arreglos */
  const flatted = flatten(map(nodes, n => n.firstNode));
  /** Eliminamos los duplicados y compactamos */
  const entryNodes = compact(uniq(flatted));
  /** Si hay más de un entry Node retornamos */
  if (entryNodes.length !== 1) {
    console.warn('More than one entry Node; no way to obtain entry Paths');
    return;
  }
  return entryNodes[0];
}
/**
 * Devuelve todos los paths que llegan a un block específico
 */
const getPathsToTarget = (g: Graph, target: string) => {
  /** Extraemos los paths para el primer node */
  const paths = extractPaths(g, target, OrderPath.BACKWARD);
  /** Eliminamos el target (ultima posición) de todas las rutas */
  const cleaned = map(paths, p => p.slice(0, p.length - 1));
  return cleaned;
}
/**
 * Valida cantidad mínimas de blocks en un flujo
 * Cada flujo debe tener una mínima cantidad de bloques
 */
const validateMinimunBlocks = (graph: Graph): ValidationResult => {
  /** Bloques mínimos por cada tipo */
  const minimuns = {
    start: 1, signal: 1, action: 1, node: 1, end:1 
  };
  /** Bloques existentes el graph */
  const counter = countBy(graph.nodes(), b => graph.node(b));
  /** Calculamos cuántos faltan */
  const compliance = map(minimuns, (v, k) => ({type: k, missing: !!counter[k] ? v - counter[k] : v}));
  /** Filtramos sólo aquellos que les falta más de cero */
  const missing = filter(compliance, v => v.missing > 0);
  /** Retornamos los tipos que están missing */
  return {valid: missing.length === 0, data: missing};
}
/**
 * Valida que todos los nodos estén conectados entre ellos
 * En los graphs se refieren a una ruta completa como component
 *
 * {@link  https://en.wikipedia.org/wiki/Component_(graph_theory)}
 */
const validateUniqueComponent = (graph: Graph): ValidationResult => {
  const components = graphAlgorithms.components(graph);
  return {valid: components.length === 1, data: components};
}
/**
 * Valida que no haya ciclo definido
 * Un ciclo es cuándo un grupo de nodos está conectado circularmente
 * 
 * Esto evita que se pueda hacer un loop en el graph
 * {@link https://github.com/dagrejs/graphlib/wiki/API-Reference#alg-find-cycles}
 */
const validateAcyclic = (graph: Graph): ValidationResult => {
  const cycles = graphAlgorithms.findCycles(graph);
  return {valid: cycles.length === 0, data: cycles};
}
/**
 * Valida que todas las conexiones sean válidas
 * 
 * Esta protección se hace a nivel gráfico con el editor,
 * pero se vuelve a hacer aquí para evitar problemas con la data
 * que se pueieran generar directamente en el api o backend
 */
const validateConnections = (graph: Graph): ValidationResult => {
  /** Obtenemos la lista de conexiones permitidas */
  const allowed = plumbBlockDefinitions.allowed;
  /** Obtenemos lista del nodos dentro del graph */
  const edges = map(graph.edges(), e => parseEdge(e, graph.edge(e), graph) );
  /** Evaluamos cuáles conexiones son inválidas */
  const invalid = differenceBy(edges, allowed, (v) =>
                                      v.source.type + v.source.port + '>' + v.target.type + v.target.port);
  /** Si hay alguno retornamos inválido */
  return {valid: invalid.length === 0, data: invalid};
}
/**
 * Valida que los sources sean del tipo start
 */
const validateSources = (graph: Graph): ValidationResult => {
  /** Buscamos los blocks que no tienen ninguna conexión de entrada */
  const sources = graph.sources();
  /** Buscamos el tipo de cada bloque */
  const mapped = map(sources, s => {
    const type = graph.node(s);
    return {block: s, type: type};
  });
  /** Filtramos los que sean inválidos */
  const invalid = filter(mapped, b => b.type !== 'start');
  const invalidIds = map(invalid, b => b.block);
  return {valid: invalid.length === 0, data: invalidIds};
}
/**
 * Valida que los sinks sean del tipo end
 */
const validateSinks = (graph: Graph): ValidationResult => {
  /** Buscamos los blocks que no tienen ninguna conexión de salida */
  const sinks = graph.sinks();
  /** Buscamos el tipo de cada bloque */
  const mapped = map(sinks, s => {
    const type = graph.node(s);
    return {block: s, type: type};
  });
  /** Filtramos los que sean inválidos */
  const invalid = filter(mapped, b => b.type !== 'end');
  const invalidIds = map(invalid, b => b.block);
  return {valid: invalid.length === 0, data: invalidIds};
}
/**
 * Valida que los nodos tengan una conexión por el puerto expiración
 */
const validateExpiration = (graph: Graph): ValidationResult => {
  /** Obtenemos lista del nodos dentro del graph */
  const all = graph.nodes();
  /** Agregamos los tipos */
  const types = map(all, b => ({block: b, type: graph.node(b)}));
  /** Filtramos sólo los de tipo espera */
  const checks = filter(types, b => b.type === 'node' );
  /** Extraemos los edges hacia afuera */
  const edges = map(checks, c => assign({}, c, {ports: getSourcePorts(graph, c.block)}));
  const compliance = map(edges, e => ({block: e.block, expired: some(e.ports, p => p === 'expiration')}))
  const invalid = filter(compliance, c => !c.expired);
  const invalidIds = map(invalid, b => b.block);
  return {valid: invalid.length === 0, data: invalidIds};
}
/**
 * Valida que todos los start se conecten con un node
 */
const validateNodeInEveryRoute = (graph: Graph): ValidationResult => {
  /** Extraemos los nodos del graph */
  const all = graph.nodes();
  /** Agregamos los tipos */
  const types = map(all, b => ({block: b, type: graph.node(b)}));
  /** Filtramos sólo los de tipo start */
  const starts = filter(types, b => b.type === 'start' );
  /** Agregamos el tipo y colocamos el orden */
  const routes = map(starts, b => ({block: b.block, paths: extractPaths(graph, b.block)}));
  const compliance = map(routes, r => ({
    block: r.block,
    paths: map(r.paths, p => ({path: p, valid: existNodeInPath(p)}))
    })
  );
  const allPaths = flatten(map(compliance, c => c.paths));
  const invalidPaths = filter(allPaths, p => !p.valid);
  const paths = map(invalidPaths, p => p.path);
  const pathsIds = map(paths, p => map(p, b => b.block));
  return {valid: paths.length === 0, data: pathsIds};
}
/**
 * Valida que todos los start apunten a un sólo Node
 */
const validateUniqueEntryNode = (graph: Graph): ValidationResult => {
  /** Extraemos los nodos del graph */
  const all = graph.nodes();
  /** Agregamos los tipos */
  const types = map(all, b => ({block: b, type: graph.node(b)}));
  /** Filtramos sólo los de tipo start */
  const starts = filter(types, b => b.type === 'start' );
  /** Agregamos el tipo y colocamos el orden */
  const routes = map(starts, b => ({block: b.block, paths: extractPaths(graph, b.block)}));
  /** Validamos que todos los paths conduzcan al mismo node */
  const nodes = map(routes, b => ({block: b.block, firstNode: map(b.paths, p => extractFirstNode(p))}));
  /** Aplanamos los arreglos */
  const flatted = flatten(map(nodes, n => n.firstNode));
  /** Eliminamos los duplicados y compactamos */
  const entryNodes = compact(uniq(flatted));
  /** Es válido si hay 1 nodo o menos en todas las rutas */
  return {valid: entryNodes.length < 2, data: entryNodes};
}
/**
 * FUNCIONES AUXILIARES
 */
/**
 * Valida que un path esté bien formado
 */
const existNodeInPath = (path: {block: string, type: string, order: number}[]): boolean => {
  /** Debe tener un node en el medio */
  const node = find(path, p => p.type === 'node');
  return !!node;
}
/**
 * Extrae el primer block del tipo node
 */
const filterUntilNextNode = (path: {block: string, type: string, order: number, edge: string}[]) => {
  /** Buscamos si existe un segundo nodo en el path */
  const secondNode = findIndex(path, (b,i) => i>0 && b.type === 'node');
  /** Si existe retornamos el path hasta el segundo node */
  return secondNode === -1 ? path : path.slice(0,secondNode + 1);
}
// TODO: Eliminar duplicación con el servicio plumbService
/**
 * Obtiene el tipo de bloque a partir de los datos del bloque
 */
const getBlockType = (blockClass) => {
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
 * Convierte bloques y edges en un graph
 * */
const buildGraph = (blocks: DesignerPropertiesValues, edges: any[]) => {
    const g = new Graph;
    blocks.forEach(b => g.setNode(b.uuid, getBlockType(b.class)));
    // edges.forEach(e => g.setEdge(extractBlockId(e.source), extractBlockId(e.target),  calculateEdgeLabel(e)));
    edges.forEach(e => g.setEdge(convertToGraphEdge(e), calculateEdgeName(e)))
    return g;
}
/**
 * Convierte un FlowEdge a GraphEdge
 */
const convertToGraphEdge = (edge: FlowEdge): GraphEdge => {
  return {
    v: edge.source.uuid,
    w: edge.target.uuid
  }
}
/**
 * Construye el label que se usa para identificar cada edge
 */
const calculateEdgeName = (edge) => {
  return edge.source.port + '-' +  edge.target.port;
}

/** 
 * Extrae el primer node de un path
 */
const extractFirstNode = (blocks): string | null => {
  const node = find(blocks, b => b.type === 'node');
  return !!node ? node.block : null;
}
/**
 * Obtiene los puertos en los que tiene una conexión un bloque
 */
const getSourcePorts =  (graph, block) => {
  const edges = graph.outEdges(block);
  const sources = map(edges, e => parseEdge(e, graph.edge(e), graph));
  const ports = map(sources, s => s.source.port);
  return ports;
}
/**
 * Extrae los paths que existen en un graph
 *
 * está inspirada en el método Deep First Search
 * {@link https://github.com/dagrejs/graphlib/blob/master/lib/alg/dfs.js}
 */
const extractPaths = (graph, block, order: OrderPath = OrderPath.FORWARD) => {
  /**
   * Verificamos que  sea aciclico
   * Este algoritmo sólo funciona para gráficos sin ciclos (DAG)
  */
  if (!graphAlgorithms.isAcyclic(graph)) {
    return;
  }
  /** Inicializamos las variables qe se usan en la función recursiva */
  const paths = [];
  const currentPath = [];
  /** Llamamos a la función recursiva */
  explorePaths(graph, block, order, currentPath, paths);
  /** Agregamos el nodo como primer bloque en todas las rutas */
  const completePaths = map(paths, p => p[0] === block ? p : concat([block], p));
  /** Ordenamos los bloques para que siempre queden en la dirección correcta */
  const ordered = map(completePaths, p => order === OrderPath.FORWARD ? p : reverse(p));
  /** Agregamos tipo y orden */
  const typed = map(ordered, p => map(p, (n, i) => ({
    block: n,
    type: graph.node(n),
    order: i,
    edge: i < p.length - 1 ? graph.edge(p[i], p[i+1]) : '' 
  })))  
  /** Retornamos el arreglo de paths */
  return typed;
}
/**
 * Recorre los paths desde un nodo
 * Esta función es recursiva 
 * 
 * Como estamos seguros que no es un ciclo,
 * no almacenamos los nodos visitados
 */
const explorePaths = (g, v, order: OrderPath, current, paths) => {
  /** Verificamos que no se quede pegado en un ciclo */
  if (Object.keys(current).length > g.nodes().length) { 
    console.warn('Maximun nodes in graph; cant be processed');
    return; 
  }
  /** Guardamos el elemento en la ruta actual */
  current.push(v);
  /** Buscamos los hijos */
  // const children = g.successors(v);
  const children = order === OrderPath.FORWARD ? g.successors(v) : g.predecessors(v);
  /** Recorremos los hijos */
  each(children, (w) => {
    explorePaths(g, w, order, current, paths);
  });
  /** Si es una hoja (no hijos) es una ruta completa */
  if (children.length === 0) {
    paths.push(current.slice());
  }
  /** Extraemos el elemento de la ruta actual */
  current.pop();
}
/**
 * Convierte la información de un graph edge
 * en el formato 
 * {source: {type, port}, target: {type, port}}
 */
const parseEdge = (edge: GraphEdge, label: string, graph: Graph) => {
  const splited = label.split('-');
  const portSource = splited[0];
  const portTarget = splited.length > 0 ? splited[1] : '';
  const typeSource = graph.node(edge.v);
  const typeTarget = graph.node(edge.w);
  return {
    source: {block: edge.v, type: typeSource, port: portSource},
    target: {block: edge.w, type: typeTarget, port: portTarget}
  };
}