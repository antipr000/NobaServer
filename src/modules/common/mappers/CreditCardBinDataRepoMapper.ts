import { Prisma } from "@prisma/client";
import { CreditCardBinData } from "../domain/CreditCardBinData";

export class CreditCardBinDataRepoMapper {
  toBINDataCreateInput(creditCardBinData: CreditCardBinData): Prisma.CreditCardBINCreateInput {
    return {
      id: creditCardBinData.props.id,
      bin: creditCardBinData.props.bin,
      ...(creditCardBinData.props.issuer && { issuer: creditCardBinData.props.issuer }),
      type: creditCardBinData.props.type,
      network: creditCardBinData.props.network,
      ...(creditCardBinData.props.mask && { mask: creditCardBinData.props.mask }),
      supported: creditCardBinData.props.supported,
      digits: creditCardBinData.props.digits,
      cvvDigits: creditCardBinData.props.cvvDigits,
    };
  }

  toBINDataUpdateInput(creditCardBinData: CreditCardBinData): Prisma.CreditCardBINUpdateInput {
    return {
      id: creditCardBinData.props.id,
      bin: creditCardBinData.props.bin,
      ...(creditCardBinData.props.issuer && { issuer: creditCardBinData.props.issuer }),
      type: creditCardBinData.props.type,
      network: creditCardBinData.props.network,
      ...(creditCardBinData.props.mask && { mask: creditCardBinData.props.mask }),
      supported: creditCardBinData.props.supported,
      digits: creditCardBinData.props.digits,
      cvvDigits: creditCardBinData.props.cvvDigits,
    };
  }
}
