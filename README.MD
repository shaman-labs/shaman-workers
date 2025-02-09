# Shaman Workers

A Deno-powered server that enables secure execution of dynamic TypeScript code stored as Shaman metadata on IPFS. Built with [MUD](https://github.com/latticexyz/mud), this project demonstrates the power of decentralized code execution in a controlled environment.

## Architecture Overview

The system consists of several key components:

1. **Code Execution Engine**: Leverages Deno's secure runtime to execute TypeScript code fetched from IPFS
2. **Storage Layer**:
   - IPFS: Stores Shaman metadata and code
   - On-chain: Stores Shaman state (active status, balance, creator) via MUD Protocol
   - Filebase: Stores execution logs and results
3. **Blockchain Integration**: Interacts with Arbitrum Sepolia network using viem

## Key Features

- **Secure Code Execution**: Utilizes Deno's sandbox environment for safe execution of external code
- **Decentralized Storage**: Combines IPFS for code storage with on-chain state management
- **TypeScript Native**: Full TypeScript support with type safety throughout the execution pipeline
- **Comprehensive Logging**: Detailed execution logs stored on Filebase

## Why Deno?

This project leverages several unique advantages of Deno:

1. **Secure by Default**: Deno's permissions system ensures controlled access to system resources
2. **Dynamic Code Execution**: Deno's ability to import and execute TypeScript code from URLs (including data URLs) makes it perfect for running code stored on IPFS
3. **Modern JavaScript/TypeScript**: Native TypeScript support without additional tooling
4. **Built-in Security**: Granular permission system for network access, file system, and environment variables
5. **Standard Library**: Rich standard library with built-in utilities for encoding, logging, and HTTP

For more information about Deno's dynamic import capabilities, see [Deno's Dynamic Import documentation](https://deno.land/manual/runtime/dynamic_import).

## Environment Variables

Environment variables can be set either through the system environment or using a `.env` file in the project root.

1. Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:

Required variables:
- `IPFS_GATEWAY`: IPFS gateway URL (default: "https://ipfs.io/ipfs/")
- `PRIVY_APP_ID`: Privy application ID
- `PRIVY_APP_SECRET`: Privy application secret
- `PRIVY_AUTH_PRIVATE_KEY`: Privy authentication private key
- `OPERATOR_PRIVATE_KEY`: EVM operator private key
- `WORLD_ADDRESS`: MUD World contract address
- `ARB_SEPOLIA_RPC_URL`: Arbitrum Sepolia RPC URL
- `S3_KEY`: Filebase S3 key
- `S3_SECRET`: Filebase S3 secret
- `S3_BUCKET`: Filebase S3 bucket name

## Running the Server

### Local Development

```bash
# Run with all required permissions
deno run --allow-net --allow-import --allow-read --allow-env --allow-sys --allow-ffi src/main.ts
```

Required permissions explained:
- `--allow-net`: For HTTP server and external API access
- `--allow-import`: For dynamic code execution from IPFS
- `--allow-read`: For reading .env and local files
- `--allow-env`: For environment variable access
- `--allow-sys`: For system information access
- `--allow-ffi`: For native bindings

### Deployment

This server is compatible with [Deno Deploy](https://deno.com/deploy). You can
deploy it directly from your GitHub repository or using the Deno Deploy CLI.

When deploying, make sure to:

1. Set your environment variables in the Deno Deploy dashboard
2. No additional permissions are needed for deployment

## API Usage

### Execute Shaman Code

```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{"shamanId": "0x..."}'
```

The system will:
1. Fetch Shaman metadata from the blockchain
2. Retrieve code from IPFS
3. Execute the code in a secure sandbox
4. Store execution results on Filebase
5. Log the operation on-chain

#### Shaman Code Format

Code stored on IPFS should be a TypeScript function with the following format:

```typescript
export default async (context: ShamanContext) => {
  const { fetch, publicClient, walletClient } = context;
  // Your code here
  return result;
};
```

The `ShamanContext` provides:
- `fetch`: HTTP client
- `publicClient`: Viem public client for blockchain reads
- `walletClient`: Privy wallet client for transactions
- Various utility functions (parseEther, formatEther, etc.)

#### Error Responses

- `400 Bad Request`: Invalid JSON body or missing hash
- `405 Method Not Allowed`: Non-POST request
- `502 Bad Gateway`: Failed to fetch IPFS metadata
- `500 Internal Server Error`: Execution error

## Prerequisites

- [Deno](https://deno.land/) runtime installed

## Setup

1. Clone the repository:

```bash
git clone https://github.com/jcurbelo/shaman-workers.git
cd shaman-workers
```

2. Install dependencies:

```bash
deno cache main.ts
```

## Development

This project uses Deno for TypeScript runtime. Configuration can be found in
`deno.json`.

## License

MIT
