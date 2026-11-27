import { createServerFn } from "@tanstack/react-start";

export type LiveNodeEphemeris = {
  tropicalLongitude: number;
  sampledAt: string;
  retrievedAt: string;
  source: "NASA/JPL Horizons";
  apiVersion: string;
};

export const getLiveNodeEphemeris = createServerFn({ method: "GET" })
  .validator((value: unknown): string => {
    if (!value || typeof value !== "string") throw new Error("A valid ephemeris timestamp is required.");
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error("The ephemeris timestamp is invalid.");
    return date.toISOString();
  })
  .handler(async ({ data }): Promise<LiveNodeEphemeris> => {
    const { getJplTrueNode } = await import("./ephemeris.server");
    return getJplTrueNode(new Date(data));
  });
