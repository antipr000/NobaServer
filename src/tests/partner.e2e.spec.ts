import { Test, TestingModule } from "@nestjs/testing";
import { UserModule } from "../modules/user/user.module";
import { JwtModule } from "@nestjs/jwt";
import * as request from "supertest";
import { AuthModule } from "../modules/auth/auth.module";
import { PartnerModule } from "../modules/partner/partner.module";
import { EmailService } from "../modules/common/email.service";
import { SMSService } from "../modules/common/sms.service";
import { anyString, when, instance } from "ts-mockito";
import { getMockEmailServiceWithDefaults } from "../modules/common/mocks/mock.email.service";
import { getMockSmsServiceWithDefaults } from "../modules/common/mocks/mock.sms.service";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "../modules/auth/jwt-auth.guard";
import { DBProvider } from "../infraproviders/DBProvider";
import { getAppConfigModule } from "../core/utils/AppConfigModule";
import { getWinstonModule } from "../core/utils/WinstonModule";
import { INestApplication } from "@nestjs/common";
import { PartnerAdmin } from "../modules/partner/domain/PartnerAdmin";
import { Partner } from "../modules/partner/domain/Partner";
import * as Mongoose from "mongoose";
import { OtpModel } from "../infra/mongodb/models/OtpModel";
import { Otp } from "../modules/auth/domain/Otp";
import { VerifyOtpResponseDTO } from "../modules/auth/dto/VerifyOtpReponse";
import { generateRandomNumber } from "../core/utils/Utils";

describe("Partner and Partner Admin end to end tests", () => {
  jest.setTimeout(5000000);
  const OLD_ENV = process.env;

  let app: INestApplication;
  let mockEmailService: EmailService;
  let mockSmsService: SMSService;
  let dbProvider: DBProvider;
  const testJwtSecret = "TEST_SECRET";

  const partnerAdminWithAllAccess = PartnerAdmin.createPartnerAdmin({
    _id: "partner-admin-all-access",
    name: "Admin with ALL access",
    role: "ALL",
    partnerId: "test-partner-1",
    email: "allaccess@noba.com",
  });

  const partnerAdminWithBasicAccess = PartnerAdmin.createPartnerAdmin({
    _id: "partner-admin-basic-access",
    name: "Admin with BASIC access",
    role: "BASIC",
    partnerId: "test-partner-1",
    email: "basicaccess@noba.com",
  });

  const partnerAdminWithIntermediateAccess = PartnerAdmin.createPartnerAdmin({
    _id: "partner-admin-intermediate-access",
    name: "Admin with INTERMEDIATE access",
    role: "INTERMEDIATE",
    partnerId: "test-partner-1",
    email: "intermediateaccess@noba.com",
  });

  const partner = Partner.createPartner({
    _id: "test-partner-1",
    name: "Mock Partner",
    takeRate: 20,
  });

  beforeEach(async done => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };
    mockEmailService = getMockEmailServiceWithDefaults();
    mockSmsService = getMockSmsServiceWithDefaults();

    when(mockEmailService.sendOtp(anyString(), anyString())).thenResolve();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PartnerModule,
        AuthModule,
        UserModule,
        getWinstonModule(),
        getAppConfigModule(),
        JwtModule.register({
          secret: testJwtSecret,
          signOptions: { expiresIn: "604800s" } /* 1 week */,
        }),
      ],
      controllers: [],
      providers: [
        {
          provide: EmailService,
          useFactory: () => instance(mockEmailService),
        },
        {
          provide: SMSService,
          useFactory: () => instance(mockSmsService),
        },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: DBProvider,
          useClass: DBProvider,
        },
      ],
    }).compile();

    dbProvider = moduleRef.get<DBProvider>(DBProvider);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("");
    await app.init();

    // Populate data in database if something is needed to be already present
    await dbProvider.partnerModel.create(partner.props);
    await dbProvider.partnerAdminModel.create(partnerAdminWithAllAccess.props);
    await dbProvider.partnerAdminModel.create(partnerAdminWithBasicAccess.props);
    await dbProvider.partnerAdminModel.create(partnerAdminWithIntermediateAccess.props);
    console.log("Added all data to database");
    done();
  });

  afterEach(async done => {
    // DB cleanup
    await dbProvider.partnerAdminModel.findByIdAndDelete(partnerAdminWithAllAccess.props._id).exec();
    await dbProvider.partnerAdminModel.findByIdAndDelete(partnerAdminWithBasicAccess.props._id).exec();
    await dbProvider.partnerAdminModel.findByIdAndDelete(partnerAdminWithIntermediateAccess.props._id).exec();
    await dbProvider.partnerModel.findByIdAndDelete(partner.props._id);
    console.log("Removed all data from database");
    Mongoose.connection.close();
    app.close();
    done();
  });

  it("should be able to perform partner admin operations for admin with 'ALL' access", async () => {
    // Login for partner admin
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: partnerAdminWithAllAccess.props.email,
        identityType: "PARTNER_ADMIN",
      })
      .set("Accept", "application/json");

    expect(response.statusCode).toBe(201);

    // Find otp from db
    const getOtpResponse = Otp.createOtp(
      await OtpModel.findOne({
        _id: partnerAdminWithAllAccess.props.email,
        identityType: "PARTNER_ADMIN",
      }).exec(),
    );

    const otp: number = getOtpResponse.props.otp;

    // Verify otp for partner admin
    const verifyOtpResponse = await request(app.getHttpServer())
      .post("/auth/verifyOtp")
      .send({
        emailOrPhone: partnerAdminWithAllAccess.props.email,
        otp: otp,
        identityType: "PARTNER_ADMIN",
      })
      .set("Accept", "application/json");

    expect(verifyOtpResponse.statusCode).toBe(201);
    const otpResponse: VerifyOtpResponseDTO = verifyOtpResponse.body;
    expect(otpResponse.user_id).toBe(partnerAdminWithAllAccess.props._id);

    const jwtToken: string = otpResponse.access_token;

    // Get details for the partner admin
    const getPartnerAdminResponse = await request(app.getHttpServer())
      .get(`/partners/admins/${partnerAdminWithAllAccess.props._id}`)
      .auth(jwtToken, { type: "bearer" });

    expect(getPartnerAdminResponse.body._id).toBe(partnerAdminWithAllAccess.props._id);
    expect(getPartnerAdminResponse.body.email).toBe(partnerAdminWithAllAccess.props.email);
    expect(getPartnerAdminResponse.body.role).toBe(partnerAdminWithAllAccess.props.role);
    expect(getPartnerAdminResponse.body.name).toBe(partnerAdminWithAllAccess.props.name);

    // Get details of partner
    const getPartnerResponse = await request(app.getHttpServer())
      .get(`/partners/${partner.props._id}`)
      .auth(jwtToken, { type: "bearer" });

    expect(getPartnerResponse.body._id).toBe(partner.props._id);
    expect(getPartnerResponse.body.name).toBe(partner.props.name);
    expect(getPartnerResponse.body.takeRate).toBe(partner.props.takeRate);

    // Update partner data
    const updatePartnerResponse = await request(app.getHttpServer())
      .patch("/partners")
      .auth(jwtToken, { type: "bearer" })
      .send({
        name: "New name",
      })
      .set("Accept", "application/json");

    expect(updatePartnerResponse.body._id).toBe(partner.props._id);
    expect(updatePartnerResponse.body.name).toBe("New name");
    expect(updatePartnerResponse.body.takeRate).toBe(partner.props.takeRate);

    // Get all partner admins
    /* const getAllAdminsResponse = await request(app.getHttpServer())
      .get("/partners/admins")
      .auth(jwtToken, { type: "bearer" });

    const partnerAdmins: PartnerAdminDTO[] = getAllAdminsResponse.body;
    expect(partnerAdmins.length).toBe(3); */

    // Add a partner admin
    const newAdminEmail = `new-admin-${generateRandomNumber()}@noba.com`;
    const addPartnerAdminResponse = await request(app.getHttpServer())
      .post("/partners/admins")
      .auth(jwtToken, { type: "bearer" })
      .send({
        name: "New Partner Admin",
        email: newAdminEmail,
        role: "BASIC",
      })
      .set("Accept", "application/json");

    expect(addPartnerAdminResponse.statusCode).toBe(201);
    expect(addPartnerAdminResponse.body.name).toBe("New Partner Admin");
    expect(addPartnerAdminResponse.body.role).toBe("BASIC");
    expect(addPartnerAdminResponse.body.email).toBe(newAdminEmail);

    const newPartnerAdminID = addPartnerAdminResponse.body._id;

    // Update partner admin details
    const updatePartnerAdminResponse = await request(app.getHttpServer())
      .patch(`/partners/admins/${newPartnerAdminID}`)
      .auth(jwtToken, { type: "bearer" })
      .send({
        name: "Update Admin Name",
        role: "INTERMEDIATE",
      })
      .set("Accept", "application/json");

    expect(updatePartnerAdminResponse.statusCode).toBe(200);
    expect(updatePartnerAdminResponse.body._id).toBe(newPartnerAdminID);
    expect(updatePartnerAdminResponse.body.name).toBe("Update Admin Name");
    expect(updatePartnerAdminResponse.body.role).toBe("INTERMEDIATE");
    expect(updatePartnerAdminResponse.body.email).toBe(newAdminEmail);

    // Delete partner admin
    const deletePartnerAdminResponse = await request(app.getHttpServer())
      .delete(`/partners/admins/${newPartnerAdminID}`)
      .auth(jwtToken, { type: "bearer" });

    expect(deletePartnerAdminResponse.statusCode).toBe(200);
    expect(deletePartnerAdminResponse.body._id).toBe(newPartnerAdminID);
  });
});
