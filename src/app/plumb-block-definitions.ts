

export interface AllowedConnection {
  source: {type: string; port: string;};
  target: {type: string; port: string;};
}
export interface PlumbEndpoint {
  port: string;
  plumb: {[index: string]: any}
}

export interface BlockDefinition {
  type: string;
  target: {
    port: string;
    plumb: {[index: string]: any}
  };
  endpoints: PlumbEndpoint[]
}

export interface PlumbBlockDefinitions {
  blocks: BlockDefinition[];
  allowed: AllowedConnection[]
}

/**
 * Bloque de tipo action
 */
const blockAction: BlockDefinition  =  {
  type: 'action',
  target: {
    port: 'in',
    plumb: {
      maxConnections: -1,
    }
  },
  endpoints: [
    {
      port: 'out',
      plumb: {}
    }
  ]
};

/**
 * Bloque de tipo parada
 */
const blockNode: BlockDefinition  = {
  type: 'node',
  target: {
    port: 'in',
    plumb: {
      maxConnections: -1,
      createEndpoint: false,
    }
  },
  endpoints: [
    {
      port: 'out',
      plumb: {
        maxConnections: 30,
        anchor: [
          // Bottom
          [0.25, 1, 0, 1, -10, -12],
          [0.75, 1, 0, 1, -10, -12],
          [0.50, 1, 0, 1,   0, -16],
          // Top
          [0.75, 0, 0, -1, 10, 12],
          [0.50, 0, 0, -1,  0, 16],
          [0.25, 0, 0, -1, 10, 12],
          // Right
          [1, 0.75, 1,  0, -12, 10],
          [1, 0.50, 1,  0, -16,   0],
          [1, 0.25, 1,  0, -12, 10],
          // Left
          [0, 0.25, -1, 0, 12, -10],
          [0, 0.50, -1, 0, 16,   0],
          [0, 0.75, -1, 0, 12, -10],
        ],
        connectorOverlays: [[ "Label", { label: "S", location:0.50, cssClass: "connector-exit-label" } ]],
      }
    },
    {
      port: 'expiration',
      plumb: {
        anchor: [
          // Bottom
          [0.75, 1, 0, 1,  10, -12],
          [0.50, 1, 0, 1,   0,   0],
          [0.25, 1, 0, 1,  10, -12],
          // Top
          [0.75, 0, 0, -1, -10, 12],
          [0.50, 0, 0, -1,   0,  0],
          [0.25, 0, 0, -1, -10, 12],
          // Right
          [1, 0.75, 1, 0,  -12, -10],
          [1, 0.50, 1, 0,    0,   0],
          [1, 0.25, 1, 0,  -12, -10],
          // Left
          [0, 0.25, -1, 0, 12, 10],
          [0, 0.50, -1, 0,  0,  0],
          [0, 0.75, -1, 0, 12, 10],
        ],
        connectorOverlays: [[ "Label", { label:"N", location: 0.50, cssClass: "connector-expiration-label" } ]],
      }
    },
  ]
}
/**
 * Block para signal
 */
const blockSignal: BlockDefinition  = {
  type: 'signal',
  target: {
    port: 'in',
    plumb: {}
  },
  endpoints: [
    {
      port: 'out',
      plumb: {}
    }
  ]
}
/**
 * Bloque para el comienzo
 */
const blockStart: BlockDefinition  = {
  type: 'start',
  target: {
    port: 'void',
    plumb: {}
  },
  endpoints: [
    {
      port: 'out',
      plumb: {
        maxConnections: -1,
      }
    }
  ]
}
/**
 * Bloque para el final
 */
const blockEnd: BlockDefinition  = {
  type: 'end',
  target: {
    port: 'in',
    plumb: {
      maxConnections: -1,
      createEndpoint: false,
    }
  },
  /** Endpoint invisible sólo para que aparezca en la lita de targets */
  endpoints: []
}
/**
 * Bloque para notas
 */
const blockNote: BlockDefinition = {
  type: 'note',
  target: {
    port: 'void',
    plumb: {}
  },
  endpoints: [],
}


const plumbBlockAllowedConnections: AllowedConnection[] = [
    {
      source: {type: 'start', port: 'out'},
      target: {type: 'signal', port: 'in'}
    },
    {
      source: {type: 'signal', port: 'out'},
      target: {type: 'action', port: 'in'}
    },
    {
      source: {type: 'signal', port: 'out'},
      target: {type: 'node', port: 'in'}
    },
    {
      source: {type: 'signal', port: 'out'},
      target: {type: 'end', port: 'in'}
    },
    {
      source: {type: 'action', port: 'out'},
      target: {type: 'node', port: 'in'}
    },
    {
      source: {type: 'action', port: 'out'},
      target: {type: 'action', port: 'in'}
    },
    {
      source: {type: 'action', port: 'out'},
      target: {type: 'end', port: 'in'}
    },
    {
      source: {type: 'node', port: 'out'},
      target: {type: 'signal', port: 'in'}
    },
    {
      source: {type: 'node', port: 'expiration'},
      target: {type: 'action', port: 'in'}
    },
    {
      source: {type: 'node', port: 'expiration'},
      target: {type: 'end', port: 'in'}
    },
]




export const plumbBlockDefinitions: PlumbBlockDefinitions = {
  blocks: [
    blockAction,
    blockNode,
    blockSignal,
    blockEnd,
    blockStart,
    blockNote,
  ],
  allowed: plumbBlockAllowedConnections
}

