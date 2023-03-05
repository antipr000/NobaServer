import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, capture, instance, when } from "ts-mockito";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { DashboardClient } from "../dashboard/dashboard.client";
import { DashboardEventHandler } from "../dashboard.event.handler";
import { getMockDashboardClientWithDefaults } from "../mocks/mock.dashboard.client";
import { SendRegisterNewEmployeeEvent } from "../events/SendRegisterNewEmployeeEvent";
import { SendUpdateEmployeeAllocationAmontEvent } from "../events/SendUpdateEmployeeAllocationAmountEvent";

describe("DashboardEventHandler", () => {
  let currencyService: CurrencyService;
  let dashboardClient: DashboardClient;
  let eventHandler: DashboardEventHandler;
  jest.setTimeout(30000);

  beforeEach(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    dashboardClient = getMockDashboardClientWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: "DashboardClient",
          useFactory: () => instance(dashboardClient),
        },
        DashboardEventHandler,
      ],
    }).compile();

    eventHandler = app.get<DashboardEventHandler>(DashboardEventHandler);
  });

  it("should call registerNewEmployee event", async () => {
    const payload = new SendRegisterNewEmployeeEvent({
      firstName: "Fake",
      lastName: "User",
      email: "fake+user@noba.com",
      phone: "+1234567890",
      employerReferralID: "fake-referral-id",
      allocationAmountInPesos: 10000,
      nobaEmployeeID: "fake-employee-id",
    });

    when(dashboardClient.registerNewEmployee(anything())).thenResolve();

    await eventHandler.sendRegisterNewEmployee(payload);

    const [data] = capture(dashboardClient.registerNewEmployee).last();
    expect(data).toStrictEqual({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      employerReferralID: payload.employerReferralID,
      allocationAmountInPesos: payload.allocationAmountInPesos,
      nobaEmployeeID: payload.nobaEmployeeID,
    });
  });

  it("should call updateEmployeeAllocationAmount event", async () => {
    const payload = new SendUpdateEmployeeAllocationAmontEvent({
      allocationAmountInPesos: 10000,
      nobaEmployeeID: "fake-employee-id",
    });

    when(dashboardClient.updateEmployeeAllocationAmount(anything(), anything())).thenResolve();

    await eventHandler.sendUpdateEmployeeAllocationAmount(payload);

    const [nobaEmployeeID, allocationAmountInPesos] = capture(dashboardClient.updateEmployeeAllocationAmount).last();
    expect(nobaEmployeeID).toBe(payload.nobaEmployeeID);
    expect(allocationAmountInPesos).toBe(payload.allocationAmountInPesos);
  });
});
