export const worldAbi = [
    {
      type: 'function',
      name: 'logShamanOperation',
      inputs: [
        {
          name: 'shamanId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
        {
          name: 'cost',
          type: 'uint256',
          internalType: 'uint256',
        },
        {
          name: 'logMetadata',
          type: 'string',
          internalType: 'string',
        },
        {
          name: 'success',
          type: 'bool',
          internalType: 'bool',
        },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getShamanActive',
      inputs: [
        {
          name: 'shamanId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'bool',
          internalType: 'bool',
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getShamanBalance',
      inputs: [
        {
          name: 'shamanId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'uint256',
          internalType: 'uint256',
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getShamanCreator',
      inputs: [
        {
          name: 'shamanId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'address',
          internalType: 'address',
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getShamanMetadata',
      inputs: [
        {
          name: 'shamanId',
          type: 'bytes32',
          internalType: 'bytes32',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'string',
          internalType: 'string',
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTokenAddress',
      inputs: [],
      outputs: [
        {
          name: '',
          type: 'address',
          internalType: 'address',
        },
      ],
      stateMutability: 'view',
    },
] as const;
