export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ valid: false });
  }

  const raw = process.env.WHITELIST_CODES || "";
  const codes = raw.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
  const isValid = codes.includes(code.trim().toLowerCase());

  // Small delay to prevent brute force
  await new Promise(r => setTimeout(r, 300));

  return res.status(200).json({ valid: isValid });
}
