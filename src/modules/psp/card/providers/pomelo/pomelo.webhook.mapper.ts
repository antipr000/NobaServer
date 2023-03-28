import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "src/core/exception/service.exception";
import { Logger } from "winston";
import { PomeloTransactionAuthzRequest } from "./dto/pomelo.transaction.service.dto";

@Injectable()
export class PomeloWebhookMapper {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) { }

  convertToPomeloTransactionAuthzRequest(requestBody: Record<string, any>, headers: Record<string, any>): PomeloTransactionAuthzRequest {
    const endpoint: string = headers["X-Endpoint"];
    const timestamp: string = headers["X-Timestamp"];
    const signature: string = headers["X-signature"];

    this.validateTransactionSubObject(requestBody);
    this.validateCardSubObject(requestBody);
    this.validateUserSubObject(requestBody);
    this.validateAmountSubObject(requestBody);

    return {
      endpoint: endpoint,
      timestamp: timestamp,
      rawSignature: signature,
      rawBodyBuffer: null,    // will be the responsibility of the controller layer.

      pomeloTransactionID: requestBody.transaction
    }
  }

  private validateTransactionSubObject(requestBody: Record<string, any>) {
    if (!requestBody["transaction"]) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "`transaction` sub-object should be present"
      });
    }

    const requiredTransactionFields = ["id", "type", "original_transaction_id"];
    for (let i = 0; i < requiredTransactionFields.length; i++) {
      if (!requestBody["transaction"][requiredTransactionFields[i]])
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: `'${requiredTransactionFields[i]}' is a required field in 'transaction' object`,
        });
    }
  }

  private validateCardSubObject(requestBody: Record<string, any>) { }

  private validateUserSubObject(requestBody: Record<string, any>) { }

  private validateAmountSubObject(requestBody: Record<string, any>) { }
}