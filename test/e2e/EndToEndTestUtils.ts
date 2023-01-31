import axios, { AxiosInstance, AxiosResponse } from "axios";
import { bootstrap } from "../../src/server";
import { TestUtility } from "../TestUtils";
import { TEST_API_KEY, computeSignature } from "../common";
import { Prisma, PrismaClient } from "@prisma/client";

export class EndToEndTestUtils extends TestUtility {
  private apiClient: AxiosInstance;
  constructor() {
    super();
  }

  static async setUp(port: number): Promise<EndToEndTestUtils> {
    const setup = new EndToEndTestUtils();
    setup.port = port;
    setup.app = await bootstrap({});
    await setup.app.listen(setup.port);
    setup.apiClient = axios.create({ baseURL: `${process.env.SERVER_BASE_URL}` });
    return setup;
  }

  private async calculateSignatureHeaders(requstMethod: string, endpoint: string, body: string) {
    const timestamp = Date.now().toString();

    return {
      "x-noba-signature": computeSignature(timestamp, requstMethod, endpoint, body),
      "x-noba-api-key": TEST_API_KEY,
      "x-noba-timestamp": timestamp,
    };
  }

  async get(endpoint: string): Promise<AxiosResponse> {
    return this.apiClient.get(endpoint, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        ...(await this.calculateSignatureHeaders("GET", endpoint, JSON.stringify({}))),
      },
    });
  }

  async post(endpoint: string, body: any): Promise<AxiosResponse> {
    return this.apiClient.post(endpoint, body, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        ...(await this.calculateSignatureHeaders("POST", endpoint, JSON.stringify(body))),
      },
    });
  }

  async patch(endpoint: string, body: any): Promise<AxiosResponse> {
    return this.apiClient.patch(endpoint, body, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        ...(await this.calculateSignatureHeaders("PATCH", endpoint, JSON.stringify(body))),
      },
    });
  }

  async prepareOnboardedConsumer(): Promise<string> {
    const email = this.getRandomEmail("john.doe");
    const phone = this.getRandomPhoneNumber("57");
    const handle = this.getRandomHandle("john.doe");

    const prisma = new PrismaClient();
    await prisma.$connect();

    const consumerCreateInput: Prisma.ConsumerCreateInput = {
      email,
      phone,
      handle,
      referralCode: this.getRandomID("referralCode"),
      firstName: "John",
      lastName: "Doe",
      displayEmail: email,
      locale: "en",
      dateOfBirth: "1990-01-01",
      address: {
        create: {
          streetLine1: "123 Main St",
          streetLine2: "Apt 1",
          city: "Bogota",
          regionCode: "BO",
          countryCode: "CO",
          postalCode: "123456",
        },
      },
      verificationData: {
        create: {
          kycCheckReference: this.getRandomID("kyc"),
          documentCheckReference: this.getRandomID("document"),
          provider: "SARDINE",
          riskLevel: "LOW",
          riskRating: "1.0",
          kycCheckStatus: "APPROVED",
          documentVerificationStatus: "APPROVED",
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
        },
      },
    };

    await prisma.consumer.create({
      data: consumerCreateInput,
    });

    return email;
  }
}
