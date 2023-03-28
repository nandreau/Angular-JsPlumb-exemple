import {
  Injectable,
  Type,
} from '@angular/core';


import {
  FlowActionBlockComponent,
} from './blocks/flow-action-block/flow-action-block.component';

import {
  FlowNodeBlockComponent,
} from './blocks/flow-node-block/flow-node-block.component';

import {
  FlowSignalBlockComponent,
} from './blocks/flow-signal-block/flow-signal-block.component';

import {
  FlowNoteBlockComponent,
} from './blocks/flow-note-block/flow-note-block.component';

import {
  FlowEndBlockComponent,
} from './blocks/flow-end-block/flow-end-block.component';

import {
  FlowStartBlockComponent,
} from './blocks/flow-start-block/flow-start-block.component';

@Injectable()
export class BlockStoreService {

  constructor() { }
  /**
   * Retorna el Type del Componente solicitado
   */
  getComponent(name: string): Type<any> {
    // TODO: Reemplazar con blockStoreService real
    let blockComponent:any = FlowNodeBlockComponent;
    switch (name) {
      case 'flow.signal':
        blockComponent = FlowSignalBlockComponent;
        break;
      case 'flow.action':
        blockComponent = FlowActionBlockComponent;
        break;
      case 'flow.note':
        blockComponent = FlowNoteBlockComponent;
        break;
      case 'flow.end':
        blockComponent = FlowEndBlockComponent;
        break;
      case 'flow.start':
        blockComponent = FlowStartBlockComponent;
        break;

    };

    return blockComponent;

  }
}