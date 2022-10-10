import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { ConsumerSimpleDTO } from "../../../modules/consumer/dto/ConsumerDTO";
import { TransactionDTO } from "../../../modules/transactions/dto/TransactionDTO";
import { KYCStatus } from "../../../modules/consumer/domain/VerificationStatus";

export enum WebhookType {
  TRANSACTION_CONFIRM = "TransConfirm",
  NOTIFICATION = "Notification",
}

export class TransConfirmDTO {
  @ApiProperty()
  consumer: ConsumerSimpleDTO;

  @ApiProperty()
  transaction: TransactionDTO;
}

class UserDataDTO {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email: string;
}

class PaymentMethodInformationDTO {
  @ApiPropertyOptional()
  cardNetwork?: string;

  @ApiProperty()
  last4Digits: string;
}

class TransactionInformationDTO {
  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  transactionTimestamp: Date;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  last4Digits: string;

  @ApiProperty()
  currencyCode: string;

  @ApiProperty()
  conversionRate: number;

  @ApiProperty()
  processingFee: number;

  @ApiProperty()
  networkFee: number;

  @ApiProperty()
  nobaFee: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  cryptoAmount: number;

  @ApiProperty()
  cryptoCurrency: string;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiPropertyOptional()
  transactionHash?: string;

  @ApiPropertyOptional()
  settledTimestamp?: Date;

  @ApiPropertyOptional()
  cryptoAmountExpected?: number;
}

class OtpDataDTO {
  @ApiProperty()
  otp: string;

  @ApiPropertyOptional()
  walletAddress?: string;
}

class PaymentHardDeclineInformationDTO {
  @ApiPropertyOptional()
  sessionId?: string;

  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  paymentToken: string;

  @ApiProperty()
  processor: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  responseCode: string;

  @ApiProperty()
  summary: string;
}

export class NotificationDTO {
  @ApiProperty({ enum: NotificationEventType, description: "Event for which notification is received" })
  event: NotificationEventType;

  @ApiPropertyOptional({ description: "User ID set by partner" })
  userId?: string;

  @ApiPropertyOptional()
  userData?: UserDataDTO;

  @ApiPropertyOptional()
  otpData?: OtpDataDTO;

  @ApiPropertyOptional({ enum: KYCStatus })
  verificationStatus?: KYCStatus;

  @ApiPropertyOptional()
  paymentMethodInformation?: PaymentMethodInformationDTO;

  @ApiPropertyOptional()
  transactionInformation?: TransactionInformationDTO;

  @ApiPropertyOptional()
  paymentHardDeclineInformation?: PaymentHardDeclineInformationDTO;
}
