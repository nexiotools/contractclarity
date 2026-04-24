import crypto from "crypto";

// Product variant IDs → access duration in days + plan name
const VARIANT_ACCESS = {
  // BrieflyAI live
  1568729: { days: 90,    plan: "Starter" },
  1568732: { days: 365,   plan: "Pro" },
  1568734: { days: 36500, plan: "Lifetime" },
  // CraftCV live
  1568762: { days: 90,    plan: "Starter" },
  1568763: { days: 365,   plan: "Pro" },
  1568764: { days: 36500, plan: "Lifetime" },
};

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "Webhook secret not configured" });

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-signature"];

  if (!signature) return res.status(401).json({ error: "No signature" });

  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = JSON.parse(rawBody.toString());
  const eventName = payload?.meta?.event_name;

  if (eventName !== "order_created") {
    return res.status(200).json({ received: true });
  }

  const attrs = payload?.data?.attributes;
  if (attrs?.status !== "paid") {
    return res.status(200).json({ received: true });
  }

  const email = attrs?.user_email?.toLowerCase();
  const variantId = parseInt(attrs?.first_order_item?.variant_id);

  if (!email) return res.status(400).json({ error: "No email in payload" });

  const access = VARIANT_ACCESS[variantId] || { days: 365, plan: "Pro" };
  const { days, plan } = access;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  const key = `access:${email}`;
  const value = JSON.stringify({ expiresAt, variantId, days, plan, grantedAt: Date.now() });

  await fetch(`${redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  console.log(`Access granted to ${email} — ${plan} for ${days} days (variant ${variantId})`);
  return res.status(200).json({ received: true });
}
