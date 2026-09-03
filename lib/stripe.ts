import Stripe from "stripe";

// Stripe is optional in Solingo (only the shop's "unlimited hearts" upgrade uses it).
// A placeholder key keeps the build and the webhook route loadable when it is not configured.
export const stripe = new Stripe(process.env.STRIPE_API_SECRET_KEY || "sk_test_unconfigured", {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
});

export const stripeConfigured = !!process.env.STRIPE_API_SECRET_KEY;
