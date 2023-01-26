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
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "./setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import { ResponseStatus } from "./api_client/core/request";
import { AdminService, DeleteNobaAdminDTO } from "./api_client";
import { NobaAdminDTO } from "../src/modules/admin/dto/NobaAdminDTO";
import {
  computeSignature,
  insertNobaAdmin,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  TEST_API_KEY,
} from "./common";
import { IntegrationTestUtility } from "./TestUtils";

describe("Noba Admin", () => {
  jest.setTimeout(20000);

  let integrationTestUtils: IntegrationTestUtility;
  let TEST_TIMESTAMP;

  beforeAll(async () => {
    integrationTestUtils = await IntegrationTestUtility.setUp(port);
    TEST_TIMESTAMP = new Date().getTime().toString();
  });

  afterAll(async () => {
    await integrationTestUtils.tearDown();
  });

  afterEach(async () => {
    await integrationTestUtils.reset();
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
      const consumerEmail = integrationTestUtils.getRandomEmail("test.consumer");

      const consumerLoginResponse = await loginAndGetResponse("", consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/admins", JSON.stringify({}));
      const getNobaAdminResponse = (await AdminService.getNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as NobaAdminDTO & ResponseStatus;
      expect(getNobaAdminResponse.__status).toBe(403);
    });

    it("Should return the details of currently logged in Noba Admin", async () => {
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const nobaAdminId = "AAAAAAAAAA";
      const nobaAdminRole = "BASIC";

      await insertNobaAdmin("", nobaAdminEmail, nobaAdminId, nobaAdminRole);
      await insertNobaAdmin("", "another.admin@noba.com", "ID2ID2ID2ID2", nobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/admins", JSON.stringify({}));
      const getNobaAdminResponse = (await AdminService.getNobaAdmin({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as NobaAdminDTO & ResponseStatus;

      expect(getNobaAdminResponse.__status).toBe(200);
      expect(getNobaAdminResponse.email).toBe(nobaAdminEmail);
      expect(getNobaAdminResponse.role).toBe(nobaAdminRole);
    });
  });

  describe("POST /admins", () => {
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test.user");

      const consumerLoginResponse = await loginAndGetResponse("", consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

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
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");

      await insertNobaAdmin("", nobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAAA"), "BASIC");
      const nobaAdminLoginResponse = await loginAndGetResponse("", nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");

      await insertNobaAdmin("", nobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAAA"), "INTERMEDIATE");
      const nobaAdminLoginResponse = await loginAndGetResponse("", nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");

      const newNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const newNobaAdminName = "Test Admin 2";
      const newNobaAdminRole = "BASIC";

      await insertNobaAdmin("", nobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAAA"), "ADMIN");
      const nobaAdminLoginResponse = await loginAndGetResponse("", nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      expect(createNobaAdminResponse.id).toBeDefined();
      expect(createNobaAdminResponse.email).toBe(newNobaAdminEmail);
      expect(createNobaAdminResponse.name).toBe(newNobaAdminName);
      expect(createNobaAdminResponse.role).toBe(newNobaAdminRole);

      // LOGIN as newly created NobaAdmin should be successful.
      const newNobaAdminLoginResponse = await loginAndGetResponse("", newNobaAdminEmail, "NOBA_ADMIN");
      expect(newNobaAdminLoginResponse.__status).toBe(201);
    });
  });

  describe("PATCH /admins/{id}", () => {
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test.user");

      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const nobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");

      const consumerLoginResponse = await loginAndGetResponse("", consumerEmail, "CONSUMER");
      console.log(consumerLoginResponse);
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "BASIC";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole);
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "INTERMEDIATE";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole);
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole);
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      expect(updateNobaAdminResponse.id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe("Test");
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminUpdatedRole);
    });

    it("should update 'name' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole);
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      expect(updateNobaAdminResponse.id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe(toUpdateNobaAdminUpdatedName);
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminCurrentRole);
    });

    it("should update both 'name' & 'role' of NobaAdmin if request is from NobaAdmin with 'ADMIN' role", async () => {
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      const loggedInNobaAdminRole = "ADMIN";

      const toUpdateNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toUpdateNobaAdminId = integrationTestUtils.getRandomID("AUAUAUAUAUAUA");
      const toUpdateNobaAdminUpdatedName = "Updated Noba Admin";
      const toUpdateNobaAdminCurrentRole = "BASIC";
      const toUpdateNobaAdminUpdatedRole = "ADMIN";

      await insertNobaAdmin("", toUpdateNobaAdminEmail, toUpdateNobaAdminId, toUpdateNobaAdminCurrentRole);
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, loggedInNobaAdminRole);

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      expect(updateNobaAdminResponse.id).toBe(toUpdateNobaAdminId);
      expect(updateNobaAdminResponse.email).toBe(toUpdateNobaAdminEmail);
      expect(updateNobaAdminResponse.name).toBe(toUpdateNobaAdminUpdatedName);
      expect(updateNobaAdminResponse.role).toBe(toUpdateNobaAdminUpdatedRole);
    });
  });

  describe("DELETE /admins/{id}", () => {
    it("shouldn't allow requests with Consumer credentials", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test.consumer");

      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const nobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");
      await insertNobaAdmin("", nobaAdminEmail, nobaAdminId, "BASIC");

      const consumerLoginResponse = await loginAndGetResponse("", consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      await insertNobaAdmin("", loggedInNobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAA"), "BASIC");

      const toDeleteNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");
      await insertNobaAdmin("", toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC");

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      await insertNobaAdmin("", loggedInNobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAA"), "INTERMEDIATE");

      const toDeleteNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");
      await insertNobaAdmin("", toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC");

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      await insertNobaAdmin("", loggedInNobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAA"), "ADMIN");

      const toDeleteNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      await insertNobaAdmin("", loggedInNobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAA"), "ADMIN");

      const toDeleteNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin.2");
      const toDeleteNobaAdminId = integrationTestUtils.getRandomID("A2A2A2A2A2A2");
      await insertNobaAdmin("", toDeleteNobaAdminEmail, toDeleteNobaAdminId, "BASIC");

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
      const loggedInNobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const loggedInNobaAdminId = integrationTestUtils.getRandomID("AAAAAAAAAAA");
      await insertNobaAdmin("", loggedInNobaAdminEmail, loggedInNobaAdminId, "ADMIN");

      const nobaAdminLoginResponse = await loginAndGetResponse("", loggedInNobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.accessToken);

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
