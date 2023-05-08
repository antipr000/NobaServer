import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, capture, instance, when } from "ts-mockito";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { DashboardClient } from "../dashboard/dashboard.client";
import { DashboardEventHandler } from "../dashboard.event.handler";
import { getMockDashboardClientWithDefaults } from "../mocks/mock.dashboard.client";
import { SendUpdatePayrollStatusEvent } from "../events/SendUpdatePayrollStatusEvent";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

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

  it("should call updatePayrollStatus event", async () => {
    const payload: SendUpdatePayrollStatusEvent = {
      nobaPayrollID: "fake-payroll-id",
      payrollStatus: PayrollStatus.COMPLETED,
    };

    when(dashboardClient.updatePayrollStatus(anything(), anything())).thenResolve();

    await eventHandler.sendUpdatePayrollStatus(payload);

    const [payrollStatus, nobaPayrollID] = capture(dashboardClient.updatePayrollStatus).last();
    expect(payrollStatus).toBe(PayrollStatus.COMPLETED);
    expect(nobaPayrollID).toBe(payload.nobaPayrollID);
  });
});
