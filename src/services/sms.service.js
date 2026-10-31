import { env } from "../config/env.js";

export async function sendSms({ to, message }) {
  if (!to || !message) return { sent: false };

  if (!env.smsApiKey) {
    console.log(`[SMS Fallback -> ${to}]: ${message}`);
    return { simulated: true, to };
  }

  // Ready for standard Bangladesh SMS gateway integration (SSL Wireless / BulkSMSBD)
  try {
    const response = await fetch("https://bulksmsbd.net/api/smsapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.smsApiKey,
        type: "text",
        number: to,
        senderid: "RoktoLagbe",
        message,
      }),
    });

    const data = await response.json().catch(() => ({}));
    return { sent: response.ok, providerResponse: data };
  } catch (error) {
    console.error("SMS gateway error:", error.message);
    return { sent: false, error: error.message };
  }
}