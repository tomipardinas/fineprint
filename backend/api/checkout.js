// POST /api/checkout
// Body: { device_id: string }
// Returns: { url: string } — Stripe checkout URL

import Stripe from "stripe";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { device_id } = req.body || {};

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // Fallback if no Stripe key configured
  if (!stripeKey) {
    return res.status(200).json({
      url: "https://buy.stripe.com/fineprint-placeholder",
      placeholder: true,
      message: "Stripe not configured — set STRIPE_SECRET_KEY env var",
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Fineprint Pro",
              description: "Unlimited ToS analysis — powered by AI",
              images: [],
            },
            unit_amount: 499, // $4.99 in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        device_id: device_id || "unknown",
      },
      success_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://fineprint.app"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://fineprint.app"}/cancel`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: `Stripe error: ${err.message}` });
  }
}
