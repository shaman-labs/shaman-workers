import { Hex, keccak256, toBytes } from "viem";

export enum Source {
  HOURLY = "interval-hourly",
  DAILY = "interval-daily",
  QUARTER_HOURLY = "interval-quarter-hourly",
  MANUAL = "manual",
}

export const SourceIds: Record<Source, Hex> = {
  [Source.HOURLY]: keccak256(toBytes(Source.HOURLY)),
  [Source.DAILY]: keccak256(toBytes(Source.DAILY)),
  [Source.QUARTER_HOURLY]: keccak256(
    toBytes(Source.QUARTER_HOURLY),
  ),
  [Source.MANUAL]: keccak256(toBytes(Source.MANUAL)),
} as const;
