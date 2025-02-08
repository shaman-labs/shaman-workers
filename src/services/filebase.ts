import { ObjectManager } from "@filebase/sdk";
import { Buffer } from "node:buffer";
import { v4 as uuidv4 } from "uuid";
import { S3_BUCKET, S3_KEY, S3_SECRET } from "../config/env.ts";
import { ExecutionResult } from "../types/shaman.ts";

export const objectManager = new ObjectManager(
  S3_KEY,
  S3_SECRET,
  {
    bucket: S3_BUCKET,
  },
);

export const uploadOperationLog = (result: ExecutionResult) =>
  objectManager.upload(
    uuidv4(),
    Buffer.from(JSON.stringify(result)),
    null,
    null,
  );
