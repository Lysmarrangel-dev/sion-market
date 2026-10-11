// Money travels as integer US cents to avoid floating point errors. Bolívares are derived
// from the BCV rate the backend returns with every quote and order.

export const usdToCents = (usd: number) => Math.round(usd * 100);
export const centsToUsd = (cents: number) => cents / 100;

/** VES amount in céntimos for a USD-cent amount at `rate` Bs per USD. */
export const centsToVesCents = (usdCents: number, rate: number) => Math.round(usdCents * rate);
