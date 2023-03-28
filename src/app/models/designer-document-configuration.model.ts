import {
  ValidationErrors,
} from '@angular/forms';

import {
  FlowEdge,
  DesignerDocumentTypes,
  FlowLayout,
} from './index';

/**
 * Interface con las propiedades que se configuran en un Flow
 */
interface DesignerFlowConfiguration {
  type: DesignerDocumentTypes.FLOW;
  readonly id: string;
  status: 'PUBLISHED' | 'DRAFT';
  connectorType: string;
  themeCss: string;
  title: string;
  owner: string;
  layout: FlowLayout,
  zoom: number,
  edges: FlowEdge[];
  errors: ValidationErrors | null;
  focused: string[];
}

export type DesignerDocumentConfiguration = DesignerFlowConfiguration;