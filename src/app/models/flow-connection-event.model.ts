import {
  FlowEdge,
} from './index';

/**
 * Modelo utilizado para notificar un evento
 * de agregar o eliminar conexión en plumb
 */
export interface FlowConnectionEvent {
  edge: FlowEdge;
  type: 'user' | 'programmatic'
}
