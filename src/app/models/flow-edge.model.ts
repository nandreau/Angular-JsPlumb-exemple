import {
  FlowPortType,
} from './index';

/**
 * Interface para definir cada edge
 * en un flujo
 */
export interface FlowEdge {
  source: {uuid: string, port: FlowPortType};
  target: {uuid: string, port: FlowPortType};
  data?: any
}