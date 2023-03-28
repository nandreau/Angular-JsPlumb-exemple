/*
 * Interface para representar el  layout de un bloque en un flujo
 */
export interface FlowLayout {
  [blockId: string]: {top: number, left: number};
}