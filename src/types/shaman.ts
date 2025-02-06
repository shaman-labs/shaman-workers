import { PublicClient } from "viem";

export interface ShamanMetadata {
  shamanId: string;
  shamanName: string;
  prompt: string;
  code: string;
  createdAt: string;
}

export interface ShamanContext {
  fetch: typeof fetch;
  publicClient: PublicClient;
}

export interface IpfsRequest {
  hash: string;
}

export interface ExecutionResult {
  shamanId: string;
  shamanName: string;
  prompt: string;
  createdAt: string;
  decodedCode: string;
  result: unknown;
} 