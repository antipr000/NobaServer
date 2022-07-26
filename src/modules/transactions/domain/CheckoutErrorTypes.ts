export type CheckoutValidationError = {
  request_id: string;
  error_type: string;
  error_codes: string[];
};

export const CHECKOUT_VALIDATION_ERROR_HTTP_CODE = 422;
