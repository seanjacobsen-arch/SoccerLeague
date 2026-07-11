import { sendPushToSubscriber } from "./lib/push.js";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const result = await sendPushToSubscriber({
      title: "Soccer Dashboard",
      body: "Test push — notifications are wired up correctly.",
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/send-test-push" };
