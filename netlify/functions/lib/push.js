import webpush from "web-push";
import { getStore } from "@netlify/blobs";

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:example@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Sends a push notification to the single stored subscription, if any. */
export async function sendPushToSubscriber(payload) {
  configureWebPush();
  const store = getStore("push");
  const subscription = await store.get("subscription", { type: "json" });
  if (!subscription) {
    return { sent: false, reason: "no_subscription" };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true };
  } catch (err) {
    // 404/410 means the browser subscription expired or was revoked — clean it up.
    if (err.statusCode === 404 || err.statusCode === 410) {
      await store.delete("subscription");
      return { sent: false, reason: "subscription_expired" };
    }
    throw err;
  }
}
