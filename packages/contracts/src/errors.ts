// Stable error codes the apps can translate into friendly messages.
export const ErrorCode = {
  VALIDATION: 'VALIDATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  OUT_OF_COVERAGE: 'OUT_OF_COVERAGE',
  RESTAURANT_CLOSED: 'RESTAURANT_CLOSED',
  PRODUCT_SOLD_OUT: 'PRODUCT_SOLD_OUT',
  MODIFIERS_INVALID: 'MODIFIERS_INVALID',
  BELOW_MINIMUM: 'BELOW_MINIMUM',
  COUPON_INVALID: 'COUPON_INVALID',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  PICKUP_PIN_INVALID: 'PICKUP_PIN_INVALID',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ApiError = { code: ErrorCode; message: string; details?: unknown };
