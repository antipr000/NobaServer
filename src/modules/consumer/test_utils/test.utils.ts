import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { Utils } from "../../../core/utils/Utils";
import { Consumer } from "../domain/Consumer";
import { Address } from "../domain/Address";
import { DocumentVerificationStatus, KYCProvider, KYCStatus } from "@prisma/client";

export const createTestConsumer = async (prismaService: PrismaService): Promise<string> => {
  const savedConsumer = await prismaService.consumer.create({
    data: {
      firstName: "Test",
      lastName: "Consumer",
      email: `${uuid()}@noba.com`,
      displayEmail: `${uuid()}@noba.com`,
      handle: `${uuid().slice(5)}${Date.now().valueOf()}`,
      referralCode: Utils.getAlphaNanoID(15),
    },
  });

  return savedConsumer.id;
};

function getRandomAddressForCountry(countryCode: string): Address {
  if (countryCode === "US") {
    return {
      streetLine1: "123 Main St",
      streetLine2: "Apt 1",
      city: "New York",
      regionCode: "NY",
      postalCode: "10001",
      countryCode: "US",
    };
  } else if (countryCode === "CO") {
    return {
      streetLine1: "123 Main St",
      streetLine2: "Apt 1",
      city: "Bogota",
      regionCode: "CO-DC",
      postalCode: "10001",
      countryCode: "CO",
    };
  }
}

export const getRandomActiveConsumer = (phoneExtension: string, countryCode: string): Consumer => {
  const email = `${uuid()}@noba.com`;
  return Consumer.createConsumer({
    id: uuid(),
    firstName: "Test",
    lastName: "Consumer",
    email: email,
    displayEmail: email,
    dateOfBirth: "1990-01-01",
    gender: "Male",
    phone: `+${phoneExtension}1234567890`,
    handle: `${uuid().slice(5)}${Date.now().valueOf()}`,
    referralCode: Utils.getAlphaNanoID(15),
    address: getRandomAddressForCountry(countryCode),
    verificationData: {
      kycCheckStatus: KYCStatus.APPROVED,
      documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
      kycCheckReference: "123",
      provider: KYCProvider.SARDINE,
    },
    isDisabled: false,
    isLocked: false,
  });
};
