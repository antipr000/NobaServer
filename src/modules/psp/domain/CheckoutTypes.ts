//https://api-reference.checkout.com/#operation/getPaymentDetails
export type CheckoutPaymentStatus =
  | "Pending"
  | "Authorized"
  | "Card Verified"
  | "Voided"
  | "Partially Captured"
  | "Captured"
  | "Partially Refunded"
  | "Refunded"
  | "Declined"
  | "Canceled"
  | "Expired"
  | "Paid";
