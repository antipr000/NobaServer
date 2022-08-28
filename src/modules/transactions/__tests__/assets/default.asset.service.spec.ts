import { Test, TestingModule } from "@nestjs/testing";
import { AppService } from "../../../../app.service";
import {
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SLIPPAGE_ALLOWED_PERCENTAGE,
  SPREAD_PERCENTAGE,
} from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { getMockAppServiceWithDefaults } from "../../../../mocks/mock.app.service";
import { instance, when } from "ts-mockito";
import { DefaultAssetService } from "../../assets/default.asset.service";
import { NobaQuote } from "../../domain/AssetTypes";
import { getMockZerohashServiceWithDefaults } from "../../mocks/mock.zerohash.service";
import { ZeroHashService } from "../../zerohash.service";

describe("DefaultAssetService", () => {
  let zerohashService: ZeroHashService;
  let appService: AppService;
  let defaultAssetService: DefaultAssetService;

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    zerohashService = getMockZerohashServiceWithDefaults();
    appService = getMockAppServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        {
          provide: ZeroHashService,
          useFactory: () => instance(zerohashService),
        },
        {
          provide: AppService,
          useFactory: () => instance(appService),
        },
        DefaultAssetService,
      ],
    }).compile();

    defaultAssetService = app.get<DefaultAssetService>(DefaultAssetService);

    when(appService.getSupportedCryptocurrencies()).thenResolve([
      {
        iconPath: "dummy/path",
        name: "ETH",
        ticker: "ETH",
        _id: "ETH",
      },
    ]);
    when(appService.getSupportedFiatCurrencies()).thenResolve([
      {
        iconPath: "dummy/path",
        name: "USD",
        ticker: "USD",
        _id: "USD",
      },
    ]);
  };

  describe("getQuoteForSpecifiedFiatAmount()", () => {
    interface QuoteInputs {
      spreadPercentage: number;
      fiatFeeDollars: number;
      dynamicCreditCardFeePercentage: number;
      fixedCreditCardFee: number;
    }

    interface QuoteExpectations {
      expectedNobaFee: number;
      expectedProcessingFee: number;
      expectedNetworkFee: number;
      quotedCostPerUnit: number;
      expectedPriceAfterFeeAndSpread: number;
    }

    const setupTestAndGetQuoteResponse = async (
      requestedFiatAmount: number,
      originalCostPerUnit: number,
      input: QuoteInputs,
      output: QuoteExpectations,
    ): Promise<NobaQuote> => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: input.spreadPercentage,
            [FLAT_FEE_DOLLARS]: input.fiatFeeDollars,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: input.dynamicCreditCardFeePercentage,
            [FIXED_CREDIT_CARD_FEE]: input.fixedCreditCardFee,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(
        zerohashService.requestQuoteForFixedFiatCurrency("ETH", "USD", output.expectedPriceAfterFeeAndSpread),
      ).thenResolve({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "id-1",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      return {
        quoteID: "id-1",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: output.expectedProcessingFee,
        networkFeeInFiat: output.expectedNetworkFee,
        nobaFeeInFiat: output.expectedNobaFee,
        totalFiatAmount: requestedFiatAmount,
        totalCryptoQuantity: (requestedFiatAmount - expectedTotalFees) / output.quotedCostPerUnit,
        perUnitCryptoPrice: output.quotedCostPerUnit,
      };
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 16,
          expectedPriceAfterFeeAndSpread: 62.5,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 9.5,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 9.5,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
          expectedPriceAfterFeeAndSpread: 90.5,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.123,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 12.3,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
          expectedPriceAfterFeeAndSpread: 87.7,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0.5,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 0.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
          expectedPriceAfterFeeAndSpread: 99.5,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 7.1,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 7.1,
          expectedProcessingFee: 12,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
          expectedPriceAfterFeeAndSpread: 80.9,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 7.5,
          expectedProcessingFee: 12,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 20,
          expectedPriceAfterFeeAndSpread: 40.25,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should take both dynamic & fixed credit card charges", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.125,
          fixedCreditCardFee: 1,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 13.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
          expectedPriceAfterFeeAndSpread: 86.5,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });
  });

  describe("getQuoteByForSpecifiedCryptoQuantity()", () => {
    interface QuoteInputs {
      spreadPercentage: number;
      fiatFeeDollars: number;
      dynamicCreditCardFeePercentage: number;
      fixedCreditCardFee: number;
    }

    interface QuoteExpectations {
      expectedNobaFee: number;
      expectedProcessingFee: number;
      expectedNetworkFee: number;
      quotedCostPerUnit: number;
    }

    const setupTestAndGetQuoteResponse = async (
      requestedCryptoQuantity: number,
      originalCostPerUnit: number,
      input: QuoteInputs,
      output: QuoteExpectations,
    ): Promise<NobaQuote> => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: input.spreadPercentage,
            [FLAT_FEE_DOLLARS]: input.fiatFeeDollars,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: input.dynamicCreditCardFeePercentage,
            [FIXED_CREDIT_CARD_FEE]: input.fixedCreditCardFee,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(zerohashService.requestQuoteForDesiredCryptoQuantity("ETH", "USD", requestedCryptoQuantity)).thenResolve({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "id-1",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      return {
        quoteID: "id-1",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: output.expectedProcessingFee,
        networkFeeInFiat: output.expectedNetworkFee,
        nobaFeeInFiat: output.expectedNobaFee,
        // (X - fees)/perUnitCost = cryptoQuantity
        totalFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
        totalCryptoQuantity: requestedCryptoQuantity,
        perUnitCryptoPrice: output.quotedCostPerUnit,
      };
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 16,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 10,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 10,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Credit card percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 56.25,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Fixed credit card fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 20,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 20,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Both credit card fee & credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 87.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Both spread & noba flat fee are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 7,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 7,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 16,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All spread, noba flat fee and credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 94.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 16,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Network fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 0,
          expectedNetworkFee: 20,
          quotedCostPerUnit: 10,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All the parameters are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
        },
      );

      const nobaQuote: NobaQuote = await defaultAssetService.getQuoteByForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });
  });
});
