// POST /api/analyze
// Body: { url: string, device_id: string, api_key?: string, profile?: object }
// Returns: { findings: [...], overall_risk: string, summary: string }

import Anthropic from "@anthropic-ai/sdk";

// In-memory usage tracker (resets on cold start — MVP-grade, intentionally simple)
const deviceUsage = new Map();

function stripHtml(html) {
  // Remove script/style blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, device_id, api_key, profile } = req.body || {};

  // 1. Validate input
  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  // Normalize device_id (optional but nice to have)
  const deviceKey = device_id || "anonymous";

  // 2. Check device usage
  if (!api_key) {
    const usageCount = deviceUsage.get(deviceKey) || 0;
    if (usageCount >= 1) {
      return res.status(200).json({
        limit_reached: true,
        checkout_url: "/api/checkout",
      });
    }
  }

  // 3. Fetch the ToS page
  let tosText;
  try {
    const fetchRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Fineprint/1.0; +https://fineprint.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!fetchRes.ok) {
      return res
        .status(400)
        .json({ error: `Failed to fetch URL: HTTP ${fetchRes.status}` });
    }

    const html = await fetchRes.text();
    tosText = stripHtml(html);

    // Truncate to 8000 chars
    if (tosText.length > 8000) {
      tosText = tosText.slice(0, 8000) + "\n\n[...truncated for analysis]";
    }
  } catch (err) {
    return res.status(400).json({ error: `Could not fetch URL: ${err.message}` });
  }

  if (!tosText || tosText.length < 50) {
    return res.status(400).json({ error: "Could not extract meaningful text from URL" });
  }

  // 4. Call Anthropic API
  const anthropicKey = api_key || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: "No Anthropic API key configured" });
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const profileContext = profile
    ? `\n\nUser profile: ${JSON.stringify(profile)}\nTailor severity based on this profile (e.g., a developer cares more about data sharing; a child safety advocate cares more about minor protections).`
    : "";

  const systemPrompt = `You are a privacy and legal expert analyzing Terms of Service.
Analyze the following ToS and identify issues in 3 categories:
1. PRIVACY — data collection, sharing with third parties, retention periods
2. SECURITY — liability for breaches, data protection measures
3. BEHAVIOR — dark patterns, opt-out vs opt-in, algorithmic manipulation, content rights

For each finding return:
- category: "privacy" | "security" | "behavior"
- severity: "critical" | "warning" | "info"
- title: short description (max 10 words)
- description: explanation (max 30 words)
- clause: exact quote from ToS (max 50 words)

Return ONLY valid JSON with this exact structure:
{ "findings": [...], "overall_risk": "high"|"medium"|"low", "summary": "2 sentence summary" }
Do not include markdown, code fences, or any text outside the JSON.${profileContext}`;

  let result;
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Please analyze the following Terms of Service:\n\n${tosText}`,
        },
      ],
      system: systemPrompt,
    });

    const rawText = message.content[0].text.trim();

    // Parse JSON response
    try {
      result = JSON.parse(rawText);
    } catch {
      // Try to extract JSON if there's extra text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }
  } catch (err) {
    return res.status(500).json({ error: `AI analysis failed: ${err.message}` });
  }

  // 5. Increment usage (only after successful analysis)
  if (!api_key) {
    const usageCount = deviceUsage.get(deviceKey) || 0;
    deviceUsage.set(deviceKey, usageCount + 1);
  }

  // 6. Return findings
  return res.status(200).json(result);
}
