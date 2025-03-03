import { Hex, keccak256, toBytes } from "viem";

export enum IntervalSource {
  HOURLY = "interval-hourly",
  DAILY = "interval-daily",
  QUARTER_HOURLY = "interval-quarter-hourly",
}

export const IntervalSourceId: Record<IntervalSource, Hex> = {
  [IntervalSource.HOURLY]: keccak256(toBytes(IntervalSource.HOURLY)),
  [IntervalSource.DAILY]: keccak256(toBytes(IntervalSource.DAILY)),
  [IntervalSource.QUARTER_HOURLY]: keccak256(
    toBytes(IntervalSource.QUARTER_HOURLY),
  ),
} as const;
