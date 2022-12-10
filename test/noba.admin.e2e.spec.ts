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
import { AdminService, DeleteNobaAdminDTO } from "./api_client";
import { NobaAdminDTO } from "../src/modules/admin/dto/NobaAdminDTO";
import {
  clearAccessTokenForNextRequests,
  computeSignature,
  insertNobaAdmin,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  TEST_API_KEY,
} from "./common";
import { getRandomEmail, getRandomID } from "./TestUtils";

describe("Noba Admin", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  let TEST_TIMESTAMP;

  beforeAll(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
    TEST_TIMESTAMP = new Date().getTime().toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    clearAccessTokenForNextRequests();
  });

  describe("GET /admins", () => {
    it("Should return 401 if not logged in", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/admins", JSON.stringify({}));
      const getNobaAdminResponse = (await AdminService.getNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(401);
    });

    it("Should return 403 if requested with Consumer credentials with same EMAIL", async () => {
      const consumerEmail = getRandomEmail("test.consumer");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/admins", JSON.stringify({}));
      const getNobaAdminResponse = (await AdminService.getNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as NobaAdminDTO & ResponseStatus;
      expect(getNobaAdminResponse.__status).toBe(403);
    });

    it("Should return the details of currently logged in Noba Admin", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");
      const nobaAdminId = "AAAAAAAAAA";
      const nobaAdminRole = "BASIC";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);
      expect(await insertNobaAdmin(mongoUri, "another.admin@noba.com", "ID2ID2ID2ID2", nobaAdminRole)).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/admins", JSON.stringify({}));
      const getNobaAdminResponse = (await AdminService.getNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(200);
      expect(getNobaAdminResponse._id).toBe(nobaAdminId);
      expect(getNobaAdminResponse.email).toBe(nobaAdminEmail);
      expect(getNobaAdminResponse.role).toBe(nobaAdminRole);
    });
  });

  describe("POST /admins", () => {
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = getRandomEmail("test.user");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/admins",
        JSON.stringify({
          email: "test.noba.admin@noba.com",
          name: "Test Admin",
          role: "BASIC",
        }),
      );

      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          email: "test.noba.admin@noba.com",
          name: "Test Admin",
          role: "BASIC",
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAAA"), "BASIC")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/admins",
        JSON.stringify({
          email: "test.noba.admin.2@noba.com",
          name: "Test Admin 2",
          role: "BASIC",
        }),
      );

      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          email: "test.noba.admin.2@noba.com",
          name: "Test Admin 2",
          role: "BASIC",
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAAA"), "INTERMEDIATE")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.
      const signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/admins",
        JSON.stringify({
          email: "test.noba.admin.2@noba.com",
          name: "Test Admin 2",
          role: "BASIC",
        }),
      );

      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          email: "test.noba.admin.2@noba.com",
          name: "Test Admin 2",
          role: "BASIC",
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(createNobaAdminResponse.__status).toBe(403);
    });

    it("should create NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      const newNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const newNobaAdminName = "Test Admin 2";
      const newNobaAdminRole = "BASIC";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAAA"), "ADMIN")).toBe(true);
      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      // TODO(#189): Remove '_id' from the input DTO.

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/admins",
        JSON.stringify({
          email: newNobaAdminEmail,
          name: newNobaAdminName,
          role: newNobaAdminRole,
        }),
      );

      const createNobaAdminResponse = (await AdminService.createNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          email: newNobaAdminEmail,
          name: newNobaAdminName,
          role: newNobaAdminRole,
        },
      })) as NobaAdminDTO & ResponseStatus;

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
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = getRandomEmail("test.user");

      const nobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const nobaAdminId = getRandomID("A2A2A2A2A2A2");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      console.log(consumerLoginResponse);
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${nobaAdminId}`,
        JSON.stringify({
          name: "Updated Test Admin",
          role: "ADMIN",
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: nobaAdminId,
        requestBody: {
          name: "Updated Test Admin",
          role: "ADMIN",
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "BASIC";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(
        await insertNobaAdmin(mongoUri, toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole),
      ).toBe(true);
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "INTERMEDIATE";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(
        await insertNobaAdmin(mongoUri, toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole),
      ).toBe(true);
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests to update the currently logged-in NobaAdmin itself", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${loggedInNobaAdminId}`,
        JSON.stringify({
          name: "Updated Test Admin",
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: loggedInNobaAdminId,
        requestBody: {
          name: "Updated Test Admin",
        } as any,
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(403);
    });

    it("should throw 404 if the requested NobaAdmin doesn't exist", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          name: "Updated Test Admin",
          role: toUpdateNobaAdminUpdatedRole,
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(404);
    });

    it("should update 'role' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(
        await insertNobaAdmin(mongoUri, toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole),
      ).toBe(true);
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          role: toUpdateNobaAdminUpdatedRole,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          role: toUpdateNobaAdminUpdatedRole,
        } as any,
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(200);
      expect(updateNobaAdminResponse._id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe("Test");
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminUpdatedRole);
    });

    it("should update 'name' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(
        await insertNobaAdmin(mongoUri, toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole),
      ).toBe(true);
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          name: toUpdateNobaAdminUpdatedName,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          name: toUpdateNobaAdminUpdatedName,
        } as any,
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(200);
      expect(updateNobaAdminResponse._id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe(toUpdateNobaAdminUpdatedName);
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminCurrentRole);
    });

    it("should update both 'name' & 'role' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      expect(
        await insertNobaAdmin(mongoUri, toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole),
      ).toBe(true);
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole)).toBe(
        true,
      );

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        `/v1/admins/${toUpdateNobaAdminId}`,
        JSON.stringify({
          name: toUpdateNobaAdminUpdatedName,
          role: toUpdateNobaAdminUpdatedRole,
        }),
      );

      const updateNobaAdminResponse = (await AdminService.updateNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toUpdateNobaAdminId,
        requestBody: {
          name: toUpdateNobaAdminUpdatedName,
          role: toUpdateNobaAdminUpdatedRole,
        },
      })) as NobaAdminDTO & ResponseStatus;

      expect(updateNobaAdminResponse.__status).toBe(200);
      expect(updateNobaAdminResponse._id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe(toUpdateNobaAdminUpdatedName);
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminUpdatedRole);
    });
  });

  describe("DELETE /admins/{id}", () => {
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = getRandomEmail("test.consumer");

      const nobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const nobaAdminId = getRandomID("A2A2A2A2A2A2");
      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, "BASIC")).toBe(true);

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "DELETE", `/v1/admins/${nobaAdminId}`, JSON.stringify({}));
      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: nobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'BASIC' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, getRandomID("AAAAAAAAAA"), "BASIC")).toBe(true);

      const toDeleteNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = getRandomID("A2A2A2A2A2A2");
      expect(await insertNobaAdmin(mongoUri, toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC")).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "DELETE",
        `/v1/admins/${toDeleteNobaAdminId}`,
        JSON.stringify({}),
      );

      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toDeleteNobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(403);
    });

    it("shouldn't allow requests from NobaAdmin with 'INTERMEDIATE' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, getRandomID("AAAAAAAAAA"), "INTERMEDIATE")).toBe(
        true,
      );

      const toDeleteNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = getRandomID("A2A2A2A2A2A2");
      expect(await insertNobaAdmin(mongoUri, toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC")).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "DELETE",
        `/v1/admins/${toDeleteNobaAdminId}`,
        JSON.stringify({}),
      );
      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toDeleteNobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(403);
    });

    it("should throw 404 if the requested NobaAdmin doesn't exist", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, getRandomID("AAAAAAAAAA"), "ADMIN")).toBe(true);

      const toDeleteNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = getRandomID("A2A2A2A2A2A2");

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "DELETE",
        `/v1/admins/${toDeleteNobaAdminId}`,
        JSON.stringify({}),
      );
      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toDeleteNobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(404);
    });

    it("should delete NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, getRandomID("AAAAAAAAAA"), "ADMIN")).toBe(true);

      const toDeleteNobaAdminEmail = getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = getRandomID("A2A2A2A2A2A2");
      expect(await insertNobaAdmin(mongoUri, toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC")).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "DELETE",
        `/v1/admins/${toDeleteNobaAdminId}`,
        JSON.stringify({}),
      );

      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: toDeleteNobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(200);
    });

    it("shouldn't allow requests to delete the currently logged-in NobaAdmin itself", async () => {
      const loggedInNobaAdminEmail = getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = getRandomID("AAAAAAAAAAA");
      expect(await insertNobaAdmin(mongoUri, loggedInNobaAdminEmail, loggedInNobaAdminId, "ADMIN")).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "DELETE",
        `/v1/admins/${loggedInNobaAdminId}`,
        JSON.stringify({}),
      );
      const deleteNobaAdminResponse = (await AdminService.deleteNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        adminId: loggedInNobaAdminId,
      })) as DeleteNobaAdminDTO & ResponseStatus;

      expect(deleteNobaAdminResponse.__status).toBe(403);
    });
  });
});
