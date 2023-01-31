import axios, { AxiosInstance, AxiosResponse } from "axios";
import { bootstrap } from "../../src/server";
import { TestUtility } from "../TestUtils";
import { TEST_API_KEY, computeSignature } from "../common";

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
}
