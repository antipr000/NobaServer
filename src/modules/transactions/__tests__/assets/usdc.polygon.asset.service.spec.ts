import { Test, TestingModule } from "@nestjs/testing";
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
import { deepEqual, instance, when } from "ts-mockito";
import { USDCPolygonAssetService } from "../../assets/usdc.polygon.asset.service";
import {
  ConsumerAccountTransferRequest,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferRequest,
  ExecutedQuote,
  ExecuteQuoteRequest,
  NobaQuote,
  PollStatus,
} from "../../domain/AssetTypes";
import { getMockZerohashServiceWithDefaults } from "../../mocks/mock.zerohash.service";
import { ZeroHashService } from "../../zerohash.service";
import {
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashTradeRequest,
  ZerohashTradeResponse,
} from "../../domain/ZerohashTypes";
import { Consumer } from "../../../consumer/domain/Consumer";
import { CurrencyType } from "../../../common/domain/Types";
import { getMockCurrencyServiceWithDefaults } from "../../../common/mocks/mock.currency.service";
import { CurrencyService } from "../../../common/currency.service";
import { Utils } from "../../../../core/utils/Utils";

describe("DefaultAssetService", () => {
  let zerohashService: ZeroHashService;
  let currencyService: CurrencyService;
  let usdcPolygonAssetService: USDCPolygonAssetService;
  const nobaPlatformCode = "ABCDE";

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    zerohashService = getMockZerohashServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        {
          provide: ZeroHashService,
          useFactory: () => instance(zerohashService),
        },
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        USDCPolygonAssetService,
      ],
    }).compile();

    usdcPolygonAssetService = app.get<USDCPolygonAssetService>(USDCPolygonAssetService);

    when(currencyService.getSupportedCryptocurrencies()).thenResolve([
      {
        iconPath: "dummy/path",
        name: "USDC (Polygon)",
        ticker: "USDC.POLYGON",
        precision: 6,
      },
    ]);

    when(currencyService.getCryptocurrency("USDC.POLYGON")).thenResolve({
      iconPath: "dummy/path",
      name: "USDC (Polygon)",
      ticker: "USDC.POLYGON",
      precision: 6,
    });

    when(currencyService.getSupportedFiatCurrencies()).thenResolve([
      {
        iconPath: "dummy/path",
        name: "USD",
        ticker: "USD",
        precision: 2,
      },
    ]);

    when(currencyService.getFiatCurrency("USD")).thenResolve({
      iconPath: "dummy/path",
      name: "USD",
      ticker: "USD",
      precision: 2,
    });

    when(zerohashService.getNobaPlatformCode()).thenReturn(nobaPlatformCode);
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
      amountPreSpread: number;
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

      when(zerohashService.estimateNetworkFee("USDC.POLYGON", "USD")).thenResolve({
        cryptoCurrency: "USDC.POLYGON",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(
        zerohashService.requestQuoteForFixedFiatCurrency("USDC.POLYGON", "USD", output.expectedPriceAfterFeeAndSpread),
      ).thenResolve({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "FIXED",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      return {
        quoteID: "FIXED",
        fiatCurrency: "USD",
        cryptoCurrency: "USDC.POLYGON",
        amountPreSpread: output.amountPreSpread,
        processingFeeInFiat: output.expectedProcessingFee,
        networkFeeInFiat: output.expectedNetworkFee,
        nobaFeeInFiat: output.expectedNobaFee,
        totalFiatAmount: requestedFiatAmount,
        totalCryptoQuantity: (requestedFiatAmount - expectedTotalFees) / output.quotedCostPerUnit,
        perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
        perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
      };
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1.6,
          amountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 6.25,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          amountPreSpread: 90.5,
          expectedPriceAfterFeeAndSpread: 90.5,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          amountPreSpread: 87.7,
          expectedPriceAfterFeeAndSpread: 87.7,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          amountPreSpread: 99.5,
          expectedPriceAfterFeeAndSpread: 99.5,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          amountPreSpread: 80.9,
          expectedPriceAfterFeeAndSpread: 80.9,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 2,
          amountPreSpread: 80.5,
          expectedPriceAfterFeeAndSpread: 40.25,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should take both dynamic & fixed credit card charges", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          amountPreSpread: 86.5,
          expectedPriceAfterFeeAndSpread: 86.5,
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });
  });

  describe("getQuoteForSpecifiedCryptoQuantity()", () => {
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
      expectedAmountPreSpread: number;
      expectedAmountPostSpread: number;
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

      when(zerohashService.estimateNetworkFee("USDC.POLYGON", "USD")).thenResolve({
        cryptoCurrency: "USDC.POLYGON",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(
        zerohashService.requestQuoteForDesiredCryptoQuantity("USDC.POLYGON", "USD", requestedCryptoQuantity),
      ).thenResolve({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "FIXED",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      return {
        quoteID: "FIXED",
        fiatCurrency: "USD",
        cryptoCurrency: "USDC.POLYGON",
        amountPreSpread: output.expectedAmountPreSpread,
        processingFeeInFiat: output.expectedProcessingFee,
        networkFeeInFiat: output.expectedNetworkFee,
        nobaFeeInFiat: output.expectedNobaFee,
        // (X - fees)/perUnitCost = cryptoQuantity
        totalFiatAmount: Utils.roundTo2DecimalNumber(
          requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
        ),
        totalCryptoQuantity: requestedCryptoQuantity,
        perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
        perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
      };
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1.6,
          expectedAmountPreSpread: 16,
          expectedAmountPostSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedAmountPostSpread: 16 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Credit card percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          expectedProcessingFee: 5.63,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedAmountPostSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Fixed credit card fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedAmountPostSpread: 16 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Both credit card fee & credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: NobaQuote = await setupTestAndGetQuoteResponse(
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.3,
          fixedCreditCardFee: 20,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 32.86,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedAmountPostSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Both spread & noba flat fee are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1.6,
          expectedAmountPreSpread: 16,
          expectedAmountPostSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All spread, noba flat fee and credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          expectedProcessingFee: 13.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 1.6,
          expectedAmountPreSpread: 16,
          expectedAmountPostSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Network fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedAmountPostSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All the parameters are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

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
          expectedProcessingFee: 47,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 1.6,
          expectedAmountPreSpread: 16,
          expectedAmountPostSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });
  });

  describe("executeQuoteForFundsAvailability()", () => {
    it("returns a fixed quote", async () => {
      const quoteID = "FIXED";

      const request: ExecuteQuoteRequest = {
        consumer: undefined,
        cryptoCurrency: "USDC.POLYGON",
        cryptoQuantity: 500,
        fiatAmount: 500,
        fiatCurrency: "USD",
        slippage: 0,
        transactionCreationTimestamp: new Date(),
        transactionID: "123456",
        fixedSide: CurrencyType.FIAT,
      };

      const quote: ExecutedQuote = {
        cryptoReceived: request.cryptoQuantity,
        tradeID: quoteID,
        tradePrice: 1,
        quote: null,
      };

      const quoteResponse = await usdcPolygonAssetService.executeQuoteForFundsAvailability(request);
      expect(quoteResponse).toEqual(quote);
    });
  });

  describe("pollExecuteQuoteForFundsAvailabilityStatus()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await usdcPolygonAssetService.pollExecuteQuoteForFundsAvailabilityStatus(null);
      }).rejects.toThrowError(Error);
    });
  });

  describe("makeFundsAvailable()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await usdcPolygonAssetService.makeFundsAvailable(null);
      }).rejects.toThrowError(Error);
    });
  });

  describe("pollFundsAvailableStatus()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await usdcPolygonAssetService.pollFundsAvailableStatus(null);
      }).rejects.toThrowError(Error);
    });
  });

  describe("transferAssetToConsumerAccount()", () => {
    it("executes a trade from the request", async () => {
      const consumer: Consumer = Consumer.createConsumer({
        _id: "1234567890",
        email: "test@noba.com",
        zhParticipantCode: "12345",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      const request: ConsumerAccountTransferRequest = {
        consumer: consumer.props,
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoAssetTradePrice: 1234,
        totalCryptoAmount: 1234,
        totalFiatAmount: 1234,
        fiatAmountPreSpread: 1234,
        transactionID: "ABCD1234",
        transactionCreationTimestamp: new Date(),
      };

      when(zerohashService.getParticipantCode(request.consumer, request.transactionCreationTimestamp)).thenResolve(
        consumer.props.zhParticipantCode,
      );

      const tradeRequest: ZerohashTradeRequest = {
        boughtAssetID: request.cryptoCurrency,
        soldAssetID: request.fiatCurrency,
        buyAmount: request.totalCryptoAmount,
        tradePrice: request.cryptoAssetTradePrice,
        sellAmount: request.fiatAmountPreSpread,
        totalFiatAmount: request.totalFiatAmount,
        buyerParticipantCode: consumer.props.zhParticipantCode,
        sellerParticipantCode: nobaPlatformCode,
        idempotencyID: request.transactionID,
        requestorEmail: request.consumer.email,
      };

      const response: ZerohashTradeResponse = {
        tradeID: "1234",
      };

      when(zerohashService.executeTrade(deepEqual(tradeRequest))).thenResolve(response);

      const tradeID = await usdcPolygonAssetService.transferAssetToConsumerAccount(request);

      expect(tradeID).toEqual(response.tradeID);
    });
  });

  describe("pollAssetTransferToConsumerStatus()", () => {
    it("returns PENDING status if trade state is PENDING", async () => {
      const tradeID = "1234";
      const settledTimestamp = Date.now();
      const tradeResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        settledTimestamp: settledTimestamp,
        tradeState: TradeState.PENDING,
        errorMessage: null,
      };

      const expectedConsumerAccountTransferStatus: ConsumerAccountTransferStatus = {
        status: PollStatus.PENDING,
        errorMessage: null,
      };

      when(zerohashService.checkTradeStatus(tradeID)).thenResolve(tradeResponse);

      const transferStatus = await usdcPolygonAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
    });

    it("returns SUCCESS status if trade state is SETTLED", async () => {
      const tradeID = "1234";
      const settledTimestamp = Date.now();
      const tradeResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        settledTimestamp: settledTimestamp,
        tradeState: TradeState.SETTLED,
        errorMessage: null,
      };

      const expectedConsumerAccountTransferStatus: ConsumerAccountTransferStatus = {
        status: PollStatus.SUCCESS,
        errorMessage: null,
      };

      when(zerohashService.checkTradeStatus(tradeID)).thenResolve(tradeResponse);

      const transferStatus = await usdcPolygonAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
    });

    it("returns FAILURE status if trade state is DEFAULTED", async () => {
      const tradeID = "1234";
      const settledTimestamp = Date.now();
      const errorMessage = "General error";
      const tradeResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        settledTimestamp: settledTimestamp,
        tradeState: TradeState.DEFAULTED,
        errorMessage: errorMessage,
      };

      const expectedConsumerAccountTransferStatus: ConsumerAccountTransferStatus = {
        status: PollStatus.FAILURE,
        errorMessage: errorMessage,
      };

      when(zerohashService.checkTradeStatus(tradeID)).thenResolve(tradeResponse);

      const transferStatus = await usdcPolygonAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
    });

    it("returns FATAL_ERROR if trade an exception is thrown", async () => {
      const tradeID = "1234";
      const errorMessage = "General error";
      const expectedConsumerAccountTransferStatus: ConsumerAccountTransferStatus = {
        status: PollStatus.FATAL_ERROR,
        errorMessage: JSON.stringify(errorMessage),
      };

      when(zerohashService.checkTradeStatus(tradeID)).thenThrow(new Error(errorMessage));

      const transferStatus = await usdcPolygonAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
    });
  });

  describe("transferToConsumerWallet()", () => {
    // Not really much to do here!
    it("returns the withdrawal ID", async () => {
      const consumer: Consumer = Consumer.createConsumer({
        _id: "1234567890",
        email: "test@noba.com",
        zhParticipantCode: "12345",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      const request: ConsumerWalletTransferRequest = {
        amount: 1234,
        assetId: "1111",
        transactionID: "XXXX",
        walletAddress: "YYYY",
        consumer: consumer.props,
      };

      const withdrawalID = "12345";

      when(
        zerohashService.requestWithdrawal(
          request.walletAddress,
          request.amount,
          request.assetId,
          request.consumer.zhParticipantCode,
          nobaPlatformCode,
        ),
      ).thenResolve(withdrawalID);

      const returnedWithdrawalID = await usdcPolygonAssetService.transferToConsumerWallet(request);
      expect(returnedWithdrawalID).toEqual(withdrawalID);
    });
  });

  describe("pollConsumerWalletTransferStatus()", () => {
    it("returns PENDING status if withdrawal is in PENDING status", async () => {
      const withdrawalID = "1234";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: 1234,
        settledAmount: 1234,
        withdrawalStatus: WithdrawalState.PENDING,
        onChainStatus: null,
        onChainTransactionID: null,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.PENDING,
        errorMessage: null,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });

    it("returns PENDING status if withdrawal is in APPROVED status", async () => {
      const withdrawalID = "1234";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: 1234,
        settledAmount: 1234,
        withdrawalStatus: WithdrawalState.APPROVED,
        onChainStatus: null,
        onChainTransactionID: null,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.PENDING,
        errorMessage: null,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });

    it("returns RETRYABLE_FAILURE status if withdrawal is in REJECTED status", async () => {
      const withdrawalID = "1234";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: 1234,
        settledAmount: 1234,
        withdrawalStatus: WithdrawalState.REJECTED,
        onChainStatus: null,
        onChainTransactionID: null,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.RETRYABLE_FAILURE,
        errorMessage: "Withdrawal request rejected.",
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });

    it("returns PENDING status if withdrawal is SETTLED and on-chain status is PENDING", async () => {
      const withdrawalID = "1234";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: 1234,
        settledAmount: 1234,
        withdrawalStatus: WithdrawalState.SETTLED,
        onChainStatus: OnChainState.PENDING,
        onChainTransactionID: null,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.PENDING,
        errorMessage: null,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });

    it("returns SUCCESS status if withdrawal is SETTLED and on-chain status is CONFIRMED", async () => {
      const withdrawalID = "1234";
      const requestedAmount = 1111;
      const settledAmount = 1111;
      const onChainTransactionID = "2222";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: requestedAmount,
        settledAmount: settledAmount,
        withdrawalStatus: WithdrawalState.SETTLED,
        onChainStatus: OnChainState.CONFIRMED,
        onChainTransactionID: onChainTransactionID,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.SUCCESS,
        errorMessage: null,
        requestedAmount: requestedAmount,
        settledAmount: settledAmount,
        onChainTransactionID: onChainTransactionID,
      });
    });

    it("returns FAILURE status if withdrawal is SETTLED and on-chain status is ERROR", async () => {
      const withdrawalID = "1234";
      const requestedAmount = 1111;
      const settledAmount = 1111;
      const onChainTransactionID = "2222";

      when(zerohashService.getWithdrawal(withdrawalID)).thenResolve({
        requestedAmount: requestedAmount,
        settledAmount: settledAmount,
        withdrawalStatus: WithdrawalState.SETTLED,
        onChainStatus: OnChainState.ERROR,
        onChainTransactionID: onChainTransactionID,
        gasPrice: null,
      });

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.FAILURE,
        errorMessage: "Transaction failed to settled on the blockchain",
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });

    it("returns PENDING status if an exception is thrown", async () => {
      const withdrawalID = "1234";

      when(zerohashService.getWithdrawal(withdrawalID)).thenThrow(new Error("Processing error"));

      const transferStatus = await usdcPolygonAssetService.pollConsumerWalletTransferStatus(withdrawalID);

      expect(transferStatus).toEqual({
        status: PollStatus.PENDING,
        errorMessage: `Error checking status of withdrawal '${withdrawalID}'`,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      });
    });
  });
});
