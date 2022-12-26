import { TestingModule, Test } from "@nestjs/testing";
import { AdminMapper } from "../mappers/AdminMapper";
import { IAdminRepo, SQLAdminRepo } from "../repos/transactions/AdminTransactionRepo";
import { Admin, AdminProps } from "../domain/Admin";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { BadRequestError } from "../../../core/exception/CommonAppException";

describe("AdminRepo Tests", () => {
  jest.setTimeout(20000);

  let adminRepo: IAdminRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeAll(async () => {
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [AdminMapper, PrismaService, SQLAdminRepo],
    }).compile();

    adminRepo = app.get<SQLAdminRepo>(SQLAdminRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.admin.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("addNobaAdmin", () => {
    it("should insert a NobaAdmin record to the DB", async () => {
      const newAdmin = getRandomAdmin("BASIC");

      const addedAdmin: Admin = await adminRepo.addNobaAdmin(newAdmin);
      const allDocumentsInAdmin = await (
        await prismaService.admin.findMany()
      ).filter(adminProps => adminProps.email === newAdmin.props.email);
      expect(allDocumentsInAdmin).toHaveLength(1);
      expect(addedAdmin.props).toEqual(allDocumentsInAdmin[0]);
    });
  });

  describe("getNobaAdminByEmail", () => {
    it("should return 'undefined' if admind with that email doesn't exists", async () => {
      const retrievedAdmin: Admin = await adminRepo.getNobaAdminByEmail("admin@noba.com");

      expect(retrievedAdmin).toBeUndefined();
    });

    it("should return 'Admin' with the given email", async () => {
      const admin: Admin = getRandomAdmin("BASIC");

      await adminRepo.addNobaAdmin(admin);
      const retrievedAdmin: Admin = await adminRepo.getNobaAdminByEmail(admin.props.email);

      expect(retrievedAdmin).toEqual(admin);
    });
  });

  describe("updateNobaAdmin", () => {
    it("should update the 'Admin' with the given email", async () => {
      const admin: Admin = getRandomAdmin("BASIC");
      await adminRepo.addNobaAdmin(admin);

      const updatedAdmin: Partial<AdminProps> = {
        role: "INTERMEDIATE",
      };
      await adminRepo.updateNobaAdmin(admin.props.id, updatedAdmin);

      const getAdmin = await adminRepo.getNobaAdminById(admin.props.id);
      expect(getAdmin.props.role).toBe("INTERMEDIATE");
    });

    it("should throw 'BadRequestError' if the 'Admin' with given email not found", async () => {
      const admin: Admin = getRandomAdmin("BASIC");
      expect(async () => await adminRepo.updateNobaAdmin(admin.props.id, { role: "INTERMEDIATE" })).rejects.toThrow(
        BadRequestError,
      );
    });
  });
});

function getRandomAdmin(role: string): Admin {
  return Admin.createAdmin({
    id: uuid(),
    name: "Test Admin",
    role: role,
    email: `admin${uuid()}@noba.com`,
  });
}
