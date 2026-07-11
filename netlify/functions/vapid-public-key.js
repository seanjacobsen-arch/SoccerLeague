export default async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return Response.json({ error: "VAPID_PUBLIC_KEY is not set" }, { status: 500 });
  }
  return Response.json({ publicKey });
};

export const config = { path: "/api/vapid-public-key" };
