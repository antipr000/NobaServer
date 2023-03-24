import { v4 } from "uuid";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { convertToDomainIdentification, Identification, IdentificationCreateRequest } from "../domain/Identification";
import { createTestConsumer } from "./test.utils";

export const getRandomIdentification = (
  consumerID: string,
): { identification: Identification; identificationCreateInput: IdentificationCreateRequest } => {
  const identification: Identification = {
    id: `${v4()}_${new Date().valueOf()}`,
    type: `${v4()}-type`,
    value: "Fake value",
    countryCode: "CO",
    consumerID: consumerID,
    createdTimestamp: new Date("2023-02-20"),
    updatedTimestamp: new Date("2023-02-20"),
  };

  const identificationCreateInput: IdentificationCreateRequest = {
    consumerID: consumerID,
    type: identification.type,
    value: identification.value,
    countryCode: identification.countryCode,
  };

  return {
    identification,
    identificationCreateInput,
  };
};
export const saveAndGetIdentification = async (
  prismaService: PrismaService,
  consumerID?: string,
): Promise<Identification> => {
  consumerID = consumerID ?? (await createTestConsumer(prismaService));
  const createdIdentification = await prismaService.identification.create({
    data: {
      id: v4(),
      consumerID: consumerID,
      type: `${v4()}-type`,
      value: "Fake value",
      countryCode: "CO",
      createdTimestamp: new Date("2023-02-20"),
      updatedTimestamp: new Date("2023-02-20"),
    },
  });

  return convertToDomainIdentification(createdIdentification);
};
