export const worldAbi = [
  {
    type: "function",
    name: "completeWorkflowJob",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "cost",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "success",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "metadata",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "enqueueWorkflowJob",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "cost",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startWorkflowJob",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getShamanCreator",
    inputs: [
      {
        name: "shamanId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getShamanIdByName",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getShamanMetadata",
    inputs: [
      {
        name: "shamanId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getShamanName",
    inputs: [
      {
        name: "shamanId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenAddress",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowActive",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowBalance",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowCreator",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowIdsByShamanId",
    inputs: [
      {
        name: "shamanId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowIdsBySourceId",
    inputs: [
      {
        name: "sourceId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowMetadata",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowShamanIds",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowSourceIds",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWorkflowState",
    inputs: [
      {
        name: "workflowId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum WorkflowState",
      },
    ],
    stateMutability: "view",
  },
] as const;
