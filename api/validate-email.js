export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ valid: false });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  const key = `access:${email.toLowerCase().trim()}`;

  try {
    const response = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const data = await response.json();

    if (!data.result) {
      await new Promise(r => setTimeout(r, 300));
      return res.status(200).json({ valid: false });
    }

    const record = JSON.parse(data.result);
    const now = Date.now();

    if (record.expiresAt < now) {
      await fetch(`${redisUrl}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      await new Promise(r => setTimeout(r, 300));
      return res.status(200).json({ valid: false, expired: true });
    }

    const daysLeft = Math.ceil((record.expiresAt - now) / (1000 * 60 * 60 * 24));
    const plan = record.plan || (record.days >= 36500 ? "Lifetime" : record.days >= 365 ? "Pro" : "Starter");

    await new Promise(r => setTimeout(r, 300));
    return res.status(200).json({
      valid: true,
      expiresAt: record.expiresAt,
      daysLeft: record.days >= 36500 ? null : daysLeft,
      plan,
    });

  } catch (e) {
    return res.status(500).json({ valid: false });
  }
}
