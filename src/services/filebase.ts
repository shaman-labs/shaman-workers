import { ObjectManager } from "@filebase/sdk";
import { v4 as uuidv4 } from "uuid";
import { S3_BUCKET, S3_KEY, S3_SECRET } from "../config/env.ts";

export const objectManager = new ObjectManager(S3_KEY, S3_SECRET, {
  bucket: S3_BUCKET,
});

export const upload = (obj: unknown) =>
  objectManager.upload(
    uuidv4(),
    new TextEncoder().encode(JSON.stringify(obj)),
    null,
    null
  );
