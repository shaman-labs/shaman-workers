import ky from "https://esm.sh/ky";

import { OX_API_KEY } from "../config/env.ts";

export const oxApiClient = ky.create({
  headers: {
    "0x-api-key": OX_API_KEY,
  },
});

export const apiClient = ky.create();

// within spells, we can make requests like this:
// const response = await apiClient.get("https://example.com").json();

// also we can add typings to our responses like this:
// const { name } = await apiClient.get<{ name: string }>("https://example.com")
//   .json();

// making a post request
// const { id } = await apiClient.post<{ id: number }>("https://example.com", {
//   json: { name },
// })
//   .json();

// we can add retries like this:
// const json = await apiClient.get("https://example.com", {
//   retry: {
//     limit: 10,
//     methods: ["get"],
//     statusCodes: [413],
//     backoffLimit: 3000,
//   },
// }).json();

// spells can extend the apiClient object by doing

// const extendedApiClient = apiClient.extend((options) => ({
//   ...options,
//   headers: {
//     ...options.headers,
//     "x-some-api-key": "apiKey",
//   },
// }));
