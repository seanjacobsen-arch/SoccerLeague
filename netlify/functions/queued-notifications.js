import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("push");
  const queued = await store.get("queued-this-week", { type: "json" });
  return Response.json(queued || { matches: [], updatedAt: null });
};

export const config = { path: "/api/queued-notifications" };
