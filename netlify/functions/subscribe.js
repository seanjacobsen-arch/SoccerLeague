import { getStore } from "@netlify/blobs";

const KEY = "subscription";

export default async (req) => {
  const store = getStore("push");

  if (req.method === "POST") {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: "Invalid subscription object" }, { status: 400 });
    }
    await store.setJSON(KEY, subscription);
    return Response.json({ subscribed: true });
  }

  if (req.method === "DELETE") {
    await store.delete(KEY);
    return Response.json({ subscribed: false });
  }

  if (req.method === "GET") {
    const subscription = await store.get(KEY, { type: "json" });
    return Response.json({ subscribed: Boolean(subscription) });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config = { path: "/api/subscribe" };
