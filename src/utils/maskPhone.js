export function maskPhone(phone) {
  if (!phone || typeof phone !== "string") return "Hidden";
  const cleaned = phone.trim();
  if (cleaned.length <= 6) return "******";
  const prefix = cleaned.slice(0, 5);
  const suffix = cleaned.slice(-2);
  return `${prefix}****${suffix}`;
}