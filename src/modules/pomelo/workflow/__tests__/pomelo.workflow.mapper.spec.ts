import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransaction,
  PomeloTransactionStatus,
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";
import { PomeloWorkflowMapper } from "../pomelo.workflow.mapper";
import { PomeloTransactionDTO } from "../../dto/pomelo.workflow.controller.dto";

describe("PomeloWorkflowMapperTests", () => {
  jest.setTimeout(20000);

  let workflowMapper: PomeloWorkflowMapper;

  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PomeloWorkflowMapper],
    }).compile();

    workflowMapper = app.get<PomeloWorkflowMapper>(PomeloWorkflowMapper);
  });

  afterEach(async () => {
    app.close();
  });

  describe("mapToPomeloTransactionDTO", () => {
    it("should map all the fields correctly", async () => {
      const pomeloTransaction: PomeloTransaction = {
        id: "NOBA_ID",
        settlementDate: "2023-05-22",
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloUserID: "POMELO_USER_ID",
        pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
        parentPomeloTransactionID: null,
        nobaTransactionID: "NOBA_TRANSACTION_ID",
        pomeloTransactionType: PomeloTransactionType.PAYMENT,
        amountInUSD: 1,
        localAmount: 2,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 3,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 4,
        transactionCurrency: PomeloCurrency.COP,
        countryCode: "COL",
        entryMode: PomeloEntryMode.CHIP,
        pointType: PomeloPointType.ATM,
        origin: PomeloOrigin.DOMESTIC,
        source: PomeloSource.CHARGEBACK_MANUAL,
        status: PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const response: PomeloTransactionDTO = workflowMapper.mapToPomeloTransactionDTO(pomeloTransaction);

      expect(response).toStrictEqual({
        id: "NOBA_ID",
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloUserID: "POMELO_USER_ID",
        pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
        parentPomeloTransactionID: null,
        nobaTransactionID: "NOBA_TRANSACTION_ID",
        pomeloTransactionType: PomeloTransactionType.PAYMENT,
        amountInUSD: 1,
        localAmount: 2,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 3,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 4,
        transactionCurrency: PomeloCurrency.COP,
        countryCode: "COL",
        entryMode: PomeloEntryMode.CHIP,
        pointType: PomeloPointType.ATM,
        origin: PomeloOrigin.DOMESTIC,
        source: PomeloSource.CHARGEBACK_MANUAL,
        status: PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        createdTimestamp: pomeloTransaction.createdTimestamp,
        updatedTimestamp: pomeloTransaction.updatedTimestamp,
      });
    });
  });
});
