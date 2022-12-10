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
  CombinedNobaQuote,
  ConsumerAccountTransferRequest,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferRequest,
  ExecutedQuote,
  ExecuteQuoteRequest,
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
import { TransactionType } from "../../domain/Types";

describe("USDCPolygonAssetService", () => {
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

      discount?: {
        fixedCreditCardFeeDiscountPercent?: number;
        networkFeeDiscountPercent?: number;
        nobaFeeDiscountPercent?: number;
        nobaSpreadDiscountPercent?: number;
        processingFeeDiscountPercent?: number;
      };
    }

    interface QuoteExpectations {
      expectedNobaFee: number;
      expectedProcessingFee: number;
      expectedNetworkFee: number;
      quotedCostPerUnit: number;
      expectedPriceAfterFeeAndSpread: number;
      amountPreSpread: number;

      discountedExpectedNobaFee: number;
      discountedExpectedProcessingFee: number;
      discountedExpectedNetworkFee: number;
      discountedQuotedCostPerUnit: number;
      discountedExpectedPriceAfterFeeAndSpread: number;
      discountedAmountPreSpread: number;
    }

    const setupTestAndGetQuoteResponse = async (
      requestedFiatAmount: number,
      originalCostPerUnit: number,
      input: QuoteInputs,
      output: QuoteExpectations,
    ): Promise<CombinedNobaQuote> => {
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

      if (!input.discount) input.discount = {};
      input.discount.fixedCreditCardFeeDiscountPercent = input.discount.fixedCreditCardFeeDiscountPercent ?? 0;
      input.discount.nobaFeeDiscountPercent = input.discount.nobaFeeDiscountPercent ?? 0;
      input.discount.networkFeeDiscountPercent = input.discount.networkFeeDiscountPercent ?? 0;
      input.discount.nobaSpreadDiscountPercent = input.discount.nobaSpreadDiscountPercent ?? 0;
      input.discount.processingFeeDiscountPercent = input.discount.processingFeeDiscountPercent ?? 0;

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
      const discountedExpectedTotalFees =
        output.discountedExpectedNobaFee + output.discountedExpectedProcessingFee + output.discountedExpectedNetworkFee;

      const nobaQuote: CombinedNobaQuote = {
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread: output.amountPreSpread,
          processingFeeInFiat: output.expectedProcessingFee,
          networkFeeInFiat: output.expectedNetworkFee,
          nobaFeeInFiat: output.expectedNobaFee,
          quotedFiatAmount: output.expectedPriceAfterFeeAndSpread,
          totalFiatAmount: requestedFiatAmount,
          perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
          perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
        },
        quote: {
          quoteID: "FIXED",
          fiatCurrency: "USD",
          cryptoCurrency: "USDC.POLYGON",
          amountPreSpread: output.discountedAmountPreSpread,
          processingFeeInFiat: output.discountedExpectedProcessingFee,
          networkFeeInFiat: output.discountedExpectedNetworkFee,
          totalCryptoQuantity: (requestedFiatAmount - discountedExpectedTotalFees) / output.discountedQuotedCostPerUnit,
          nobaFeeInFiat: output.discountedExpectedNobaFee,
          quotedFiatAmount:
            output.expectedPriceAfterFeeAndSpread +
            (output.discountedExpectedPriceAfterFeeAndSpread - output.expectedPriceAfterFeeAndSpread),
          totalFiatAmount: requestedFiatAmount,
          perUnitCryptoPriceWithSpread: output.discountedQuotedCostPerUnit,
          perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };
      return nobaQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 62.5,

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1.6,
          discountedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 62.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });

      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 9.5,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 90.5,
          discountedExpectedPriceAfterFeeAndSpread: 90.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 12.3,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 87.7,
          discountedExpectedPriceAfterFeeAndSpread: 87.7,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 99.5,
          discountedExpectedPriceAfterFeeAndSpread: 99.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 7.1,
          discountedExpectedProcessingFee: 12,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 80.9,
          discountedExpectedPriceAfterFeeAndSpread: 80.9,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 12,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 2,
          discountedAmountPreSpread: 80.5,
          discountedExpectedPriceAfterFeeAndSpread: 40.25,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("should take both dynamic & fixed credit card charges", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 13.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 86.5,
          discountedExpectedPriceAfterFeeAndSpread: 86.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("all fees are waived", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.125,
          fixedCreditCardFee: 1,
          discount: {
            fixedCreditCardFeeDiscountPercent: 1,
            networkFeeDiscountPercent: 1,
            nobaFeeDiscountPercent: 1,
            nobaSpreadDiscountPercent: 1,
            processingFeeDiscountPercent: 1,
          },
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 13.5,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 2,
          amountPreSpread: 86.5,
          expectedPriceAfterFeeAndSpread: 50,

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100,
        },
      );

      expectedNobaQuote.discountsGiven = {
        creditCardFeeDiscount: 1,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        processingFeeDiscount: 12.5,
        spreadDiscount: 50,
      };

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 1,
          networkFeeDiscountPercent: 1,
          nobaFeeDiscountPercent: 1,
          nobaSpreadDiscountPercent: 1,
          processingFeeDiscountPercent: 1,
        },
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("network fee is waived when transaction type is NOBA_WALLET", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0.125,
          fixedCreditCardFee: 1,
          discount: {
            fixedCreditCardFeeDiscountPercent: 1,
            networkFeeDiscountPercent: 0, // 0% discount on network fees
            nobaFeeDiscountPercent: 1,
            nobaSpreadDiscountPercent: 1,
            processingFeeDiscountPercent: 1,
          },
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 13.5,
          expectedNetworkFee: 5,
          quotedCostPerUnit: 2,
          amountPreSpread: 81.5,
          expectedPriceAfterFeeAndSpread: 50,

          // Expected amounts are the same with no discount
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100,
        },
      );

      expectedNobaQuote.discountsGiven = {
        creditCardFeeDiscount: 1,
        networkFeeDiscount: 5,
        nobaFeeDiscount: 0,
        processingFeeDiscount: 12.5,
        spreadDiscount: 50,
      };

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.NOBA_WALLET,
        discount: {
          fixedCreditCardFeeDiscountPercent: 1,
          networkFeeDiscountPercent: 0, // Keeping network fee discount as 0%
          nobaFeeDiscountPercent: 1,
          nobaSpreadDiscountPercent: 1,
          processingFeeDiscountPercent: 1,
        },
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

      discount?: {
        fixedCreditCardFeeDiscountPercent?: number;
        networkFeeDiscountPercent?: number;
        nobaFeeDiscountPercent?: number;
        nobaSpreadDiscountPercent?: number;
        processingFeeDiscountPercent?: number;
      };
    }

    interface QuoteExpectations {
      expectedNobaFee: number;
      expectedProcessingFee: number;
      expectedNetworkFee: number;
      quotedCostPerUnit: number;
      expectedPriceAfterFeeAndSpread: number;
      expectedAmountPreSpread: number;

      discountedExpectedNobaFee: number;
      discountedExpectedProcessingFee: number;
      discountedExpectedNetworkFee: number;
      discountedQuotedCostPerUnit: number;
      discountedExpectedPriceAfterFeeAndSpread: number;
      discountedExpectedAmountPreSpread: number;
    }

    const setupTestAndGetQuoteResponse = async (
      requestedCryptoQuantity: number,
      originalCostPerUnit: number,
      input: QuoteInputs,
      output: QuoteExpectations,
    ): Promise<CombinedNobaQuote> => {
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

      if (!input.discount) input.discount = {};
      input.discount.fixedCreditCardFeeDiscountPercent = input.discount.fixedCreditCardFeeDiscountPercent ?? 0;
      input.discount.nobaFeeDiscountPercent = input.discount.nobaFeeDiscountPercent ?? 0;
      input.discount.networkFeeDiscountPercent = input.discount.networkFeeDiscountPercent ?? 0;
      input.discount.nobaSpreadDiscountPercent = input.discount.nobaSpreadDiscountPercent ?? 0;
      input.discount.processingFeeDiscountPercent = input.discount.processingFeeDiscountPercent ?? 0;

      when(zerohashService.estimateNetworkFee("USDC.POLYGON", "USD")).thenResolve({
        cryptoCurrency: "USDC.POLYGON",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });

      // Doesn't call Zerohash for any quote as the mapping is static as of now.
      // when(
      //   zerohashService.requestQuoteForDesiredCryptoQuantity("USDC.POLYGON", "USD", requestedCryptoQuantity),
      // ).thenResolve({
      //   cryptoCurrency: "USDC.POLYGON",
      //   fiatCurrency: "USD",
      //   expireTimestamp: Date.now(),
      //   perUnitCryptoAssetCost: 1,
      //   quoteID: "FIXED",
      // });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      const discountedExpectedTotalFees =
        output.discountedExpectedNobaFee + output.discountedExpectedProcessingFee + output.discountedExpectedNetworkFee;

      const expectedQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "FIXED",
          fiatCurrency: "USD",
          cryptoCurrency: "USDC.POLYGON",
          amountPreSpread: output.expectedAmountPreSpread,
          processingFeeInFiat: output.expectedProcessingFee,
          networkFeeInFiat: output.expectedNetworkFee,
          nobaFeeInFiat: output.expectedNobaFee,
          quotedFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit,
          // (X - fees)/perUnitCost = cryptoQuantity
          totalFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit + discountedExpectedTotalFees,
          totalCryptoQuantity: requestedCryptoQuantity,
          perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
          perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread: output.expectedAmountPreSpread,
          processingFeeInFiat: output.expectedProcessingFee,
          networkFeeInFiat: output.expectedNetworkFee,
          nobaFeeInFiat: output.expectedNobaFee,
          quotedFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit,
          // (X - fees)/perUnitCost = cryptoQuantity
          totalFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
          perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
          perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          spreadDiscount: 0,
          processingFeeDiscount: 0,
        },
      };

      const fiatAmountFieldsForRoundingInQuote = [
        "amountPreSpread",
        "processingFeeInFiat",
        "networkFeeInFiat",
        "nobaFeeInFiat",
        "quotedFiatAmount",
        "totalFiatAmount",
        "perUnitCryptoPriceWithSpread",
        "perUnitCryptoPriceWithoutSpread",
      ];
      fiatAmountFieldsForRoundingInQuote.forEach(field => {
        expectedQuote.quote[field] = Utils.roundTo2DecimalNumber(expectedQuote.quote[field]);
        expectedQuote.nonDiscountedQuote[field] = Utils.roundTo2DecimalNumber(expectedQuote.nonDiscountedQuote[field]);
      });

      return expectedQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0.6),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1.6,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0.6),
        },
      );

      const quote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(quote.quote).toEqual(expectedNobaQuote.quote);
      expect(quote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0),

          discountedExpectedNobaFee: 10,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0),
        },
      );
      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("Credit card percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedProcessingFee: 5.625,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 5.625,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("Fixed credit card fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 20,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("Both credit card fee & credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedProcessingFee: 36.875,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 1,
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 36.875,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("Both spread & noba flat fee are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 16 * (1 + 0.6),

          discountedExpectedNobaFee: 7,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1.6,
          discountedExpectedAmountPreSpread: 16,
          discountedExpectedPriceAfterFeeAndSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All spread, noba flat fee and credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 16 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 13.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 1.6,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 16 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("Network fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 20,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(nobaQuote).toEqual(expectedNobaQuote);
    });

    it("All the parameters are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedAmountPreSpread: 10,
          expectedPriceAfterFeeAndSpread: 10 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 47,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 1.6,
          discountedExpectedAmountPreSpread: 10,
          discountedExpectedPriceAfterFeeAndSpread: 10 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await usdcPolygonAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "USDC.POLYGON",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
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
        transactionType: TransactionType.ONRAMP,
      };

      const quote: ExecutedQuote = {
        cryptoReceived: request.cryptoQuantity,
        tradeID: quoteID,
        tradePrice: 1,
        quote: {
          discountsGiven: {
            creditCardFeeDiscount: 0,
            networkFeeDiscount: 0,
            nobaFeeDiscount: 0,
            processingFeeDiscount: 0,
            spreadDiscount: 0,
          },
          nonDiscountedQuote: {
            amountPreSpread: 288,
            fiatCurrency: "USD",
            networkFeeInFiat: 4,
            nobaFeeInFiat: 8,
            perUnitCryptoPriceWithSpread: 1.6,
            perUnitCryptoPriceWithoutSpread: 1,
            processingFeeInFiat: 200,
            quotedFiatAmount: 180,
            totalFiatAmount: 500,
          },
          quote: {
            amountPreSpread: 288,
            cryptoCurrency: "USDC.POLYGON",
            fiatCurrency: "USD",
            networkFeeInFiat: 4,
            nobaFeeInFiat: 8,
            perUnitCryptoPriceWithSpread: 1.6,
            perUnitCryptoPriceWithoutSpread: 1,
            processingFeeInFiat: 200,
            quoteID: "FIXED",
            quotedFiatAmount: 180,
            totalCryptoQuantity: 180,
            totalFiatAmount: 500,
          },
        },
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
        bankFee: Utils.roundTo2DecimalString(request.totalFiatAmount - request.fiatAmountPreSpread),
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
          undefined,
        ),
      ).thenResolve(withdrawalID);

      const returnedWithdrawalResponse = await usdcPolygonAssetService.transferToConsumerWallet(request);
      expect(returnedWithdrawalResponse.liquidityProviderTransactionId).toEqual(withdrawalID);
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
