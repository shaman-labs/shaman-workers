# Shaman Workers

A Deno server that executes Shaman code from IPFS metadata.

## Environment Variables

Environment variables can be set either through the system environment or using
a `.env` file in the project root.

1. Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:

```env
# IPFS Gateway URL (include trailing slash)
IPFS_GATEWAY=https://ipfs.io/ipfs/
```

Available variables:

- `IPFS_GATEWAY`: The IPFS gateway URL to use for fetching metadata (default:
  "https://ipfs.io/ipfs/")
  - Example alternative gateways:
    - `https://ipfs.io/ipfs/`
    - `https://cloudflare-ipfs.com/ipfs/`
    - `https://gateway.pinata.cloud/ipfs/`

## Running the Server

### Local Development

```bash
# Using environment variables from .env file
deno run --allow-net --allow-read --allow-env main.ts

# Or override with custom IPFS gateway
IPFS_GATEWAY=https://your-gateway.com/ipfs/ deno run --allow-net --allow-read --allow-env main.ts
```

Required permissions:

- `--allow-net`: For HTTP server and IPFS gateway access
- `--allow-read`: For reading .env file (local development only)
- `--allow-env`: For environment variable access

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
  -d '{"hash": "YOUR_IPFS_HASH"}'
```

#### Request Body

```json
{
  "hash": "Qmc1DQXPvK8BbBpnqt2RTmHYSKNDAx3evozK2GMX7DQ85b"
}
```

#### Response

```json
{
  "shamanName": "Fetch ETH",
  "prompt": "Fetch ETH Price",
  "createdAt": "2025-02-04T23:23:08.887Z",
  "code": "CID",
  "result": {
    "ethPrice": 2500.50
  }
}
```

The IPFS metadata format is:

```json
{
  "shamanName": "Fetch ETH",
  "prompt": "Fetch ETH Price",
  "code": "QmVVEHkTDc7LBzp61MmgNXPSwkj4Qr82CsCL1s6MPkfEqx",
  "createdAt": "2025-02-04T23:23:08.887Z"
}
```

The code at the IPFS hash should be a TypeScript function with the following
format:

```typescript
export default async (context: ShamanContext) => {
  const { fetch } = context;
  // Your code here
  return result;
};
```

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
