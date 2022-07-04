/**
 * Setup the required environment variables for
 *   - API Client
 *   - Test Configs for different Vendors
 *
 * This is required to be the very first line in
 * the test files (even before other imports) as
 * API Client requires certain environment variables
 * to be set before any of it's class is even
 * imported.
 */
import { setUp } from "./setup";
setUp();

import { INestApplication } from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/server";
import { ResponseStatus } from "./api_client/core/request";
import { AdminService, AuthenticationService, VerifyOtpResponseDTO } from "./api_client";
import { NobaAdminDTO } from "src/modules/admin/dto/NobaAdminDTO";
import { fetchOtpFromDb, insertNobaAdmin, insertPartnerAdmin, loginAndGetResponse, setAccessTokenForTheNextRequests } from "./common";

describe("Noba Admin", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;

  beforeEach(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log("MongoMemoryServer running at: ", mongoUri);

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);

    console.log(`Server started on port '${port} ...'`);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  describe("GET /admins", () => {
    it("Should return 401 if not logged in", async () => {
      const getNobaAdminResponse = (await AdminService.getNobaAdmin()) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(401);
    });

    it("Should return 403 if requested with PartnerAdmin credentials with same EMAIL", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);

      await AuthenticationService.loginUser({
        email: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
      });
      const verifyOtpResponse = await AuthenticationService.verifyOtp({
        emailOrPhone: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
        otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
      });

      setAccessTokenForTheNextRequests(verifyOtpResponse.access_token);
      const getNobaAdminResponse = (await AdminService.getNobaAdmin()) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(403);
    });

    it("Should return 403 if requested with Consumer credentials with same EMAIL", async () => {
      const consumerEmail = "test.consumer@noba.com";

      await AuthenticationService.loginUser({
        email: consumerEmail,
        identityType: "CONSUMER",
      });
      const verifyOtpResponse = await AuthenticationService.verifyOtp({
        emailOrPhone: consumerEmail,
        identityType: "CONSUMER",
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
      });

      setAccessTokenForTheNextRequests(verifyOtpResponse.access_token);
      const getNobaAdminResponse = (await AdminService.getNobaAdmin()) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(403);
    });

    it("Should return the details of currently logged in Noba Admin", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";
      const nobaAdminId = "AAAAAAAAAA";
      const nobaAdminRole = "BASIC";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);
      expect(await insertNobaAdmin(mongoUri, "another.admin@noba.com", "ID2ID2ID2ID2", nobaAdminRole)).toBe(true);

      await AuthenticationService.loginUser({
        email: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
      });
      const verifyOtpResponse = await AuthenticationService.verifyOtp({
        emailOrPhone: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
        otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
      });

      setAccessTokenForTheNextRequests(verifyOtpResponse.access_token);
      const getNobaAdminResponse = (await AdminService.getNobaAdmin()) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(200);
      expect(getNobaAdminResponse._id).toBe(nobaAdminId);
      expect(getNobaAdminResponse.email).toBe(nobaAdminEmail);
      expect(getNobaAdminResponse.role).toBe(nobaAdminRole);
    });
  });

  describe("POST /admins", () => {
    it("shouldn't allow requests with PartnerAdmin credentials", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);
      const partnerLoginResponse = await loginAndGetResponse(mongoUri, partnerAdminEmail, "PARTNER_ADMIN");
      setAccessTokenForTheNextRequests(partnerLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        _id: "AAAAAAAAAA",
        email: "test.noba.admin@noba.com",
        name: "Test Admin",
        role: "BASIC"
      })) as (NobaAdminDTO & ResponseStatus);

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = "test.user@noba.com";

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        _id: "AAAAAAAAAA",
        email: "test.noba.admin@noba.com",
        name: "Test Admin",
        role: "BASIC"
      })) as (NobaAdminDTO & ResponseStatus);

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAAA", "BASIC")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        _id: "AAAAAAAAAA",
        email: "test.noba.admin.2@noba.com",
        name: "Test Admin 2",
        role: "BASIC"
      })) as (NobaAdminDTO & ResponseStatus);

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAAA", "INTERMEDIATE")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        _id: "AAAAAAAAAA",
        email: "test.noba.admin.2@noba.com",
        name: "Test Admin 2",
        role: "BASIC"
      })) as (NobaAdminDTO & ResponseStatus);

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("should create NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      const newNobaAdminEmail = "test.noba.admin.2@noba.com";
      const newNobaAdminName = "Test Admin 2";
      const newNobaAdminRole = "BASIC";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAAA", "ADMIN")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        _id: "A2A2A2A2A2A2",
        email: newNobaAdminEmail,
        name: newNobaAdminName,
        role: newNobaAdminRole
      })) as (NobaAdminDTO & ResponseStatus);

      expect(createNobaAdminResponse.__status).toBe(201);
      expect(createNobaAdminResponse._id).toBeDefined();
      expect(createNobaAdminResponse.email).toBe(newNobaAdminEmail);
      expect(createNobaAdminResponse.name).toBe(newNobaAdminName);
      expect(createNobaAdminResponse.role).toBe(newNobaAdminRole);

      // LOGIN as newly created NobaAdmin should be successful.
      const newNobaAdminLoginResponse = await loginAndGetResponse(mongoUri, newNobaAdminEmail, "NOBA_ADMIN");
      expect(newNobaAdminLoginResponse.__status).toBe(201);
    });
  });

  describe("PATCH /admins/{id}", () => {
    it("shouldn't allow requests with PartnerAdmin credentials", async () => {

    });

    it("shouldn't allow requests with Consumer credentials", async () => {

    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {

    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {

    });

    it("shouldn't allow requests to update the currently logged-in NobaAdmin itself", async () => {

    });

    it("should throw 404 if the requested NobaAdmin doesn't exist", async () => {

    });

    it("should update 'role' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {

    });

    it("should update 'name' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {

    });

    it("should update both 'name' & 'role' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {

    });
  });

  describe("DELETE /admins/{id}", () => {
    it("shouldn't allow requests with PartnerAdmin credentials", async () => {

    });

    it("shouldn't allow requests with Consumer credentials", async () => {

    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {

    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {

    });

    it("should throw 404 if the requested NobaAdmin doesn't exist", async () => {

    });

    it("should delete NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {

    });

    it("shouldn't allow requests to delete the currently logged-in NobaAdmin itself", async () => {

    });
  });
});
