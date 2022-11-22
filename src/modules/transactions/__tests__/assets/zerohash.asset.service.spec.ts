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
import {
  CombinedNobaQuote,
  ConsumerAccountTransferRequest,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferRequest,
  ExecutedQuote,
  ExecuteQuoteRequest,
  FundsAvailabilityRequest,
  FundsAvailabilityResponse,
  PollStatus,
} from "../../domain/AssetTypes";
import { getMockZerohashServiceWithDefaults } from "../../mocks/mock.zerohash.service";
import { ZeroHashService } from "../../zerohash.service";
import {
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashAccountType,
  ZerohashTradeRequest,
  ZerohashTradeResponse,
  ZerohashTransferResponse,
  ZerohashTransferStatus,
} from "../../domain/ZerohashTypes";
import { Consumer } from "../../../consumer/domain/Consumer";
import { BadRequestError } from "../../../../core/exception/CommonAppException";
import { CurrencyType } from "../../../common/domain/Types";
import { getMockCurrencyServiceWithDefaults } from "../../../common/mocks/mock.currency.service";
import { CurrencyService } from "../../../common/currency.service";
import { ZerohashAssetService } from "../../assets/zerohash.asset.service";
import { Utils } from "../../../../core/utils/Utils";
import { BadRequestException } from "@nestjs/common";
import { TransactionSubmissionException } from "../../exceptions/TransactionSubmissionException";
import { TransactionType } from "../../domain/Types";

describe("ZerohashAssetService", () => {
  let zerohashService: ZeroHashService;
  let currencyService: CurrencyService;
  let zerohashAssetService: ZerohashAssetService;
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
        ZerohashAssetService,
      ],
    }).compile();

    zerohashAssetService = app.get<ZerohashAssetService>(ZerohashAssetService);

    when(currencyService.getSupportedCryptocurrencies()).thenResolve([
      {
        iconPath: "dummy/path",
        name: "ETH",
        ticker: "ETH",
        precision: 8,
      },
    ]);

    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      iconPath: "dummy/path",
      name: "ETH",
      ticker: "ETH",
      precision: 8,
    });

    when(currencyService.getCryptocurrency("USDC.ETH")).thenResolve({
      iconPath: "dummy/path",
      name: "USD Coin",
      ticker: "USDC.ETH",
      precision: 8,
      spreadOverride: 0.01,
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
      cryptocurrency: string,
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

      when(zerohashService.estimateNetworkFee(cryptocurrency, "USD")).thenResolve({
        cryptoCurrency: cryptocurrency,
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });

      when(
        zerohashService.requestQuoteForFixedFiatCurrency(
          cryptocurrency,
          "USD",
          Utils.roundTo2DecimalNumber(output.discountedExpectedPriceAfterFeeAndSpread),
        ),
      ).thenResolve({
        cryptoCurrency: cryptocurrency,
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "id-1",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      const discountedExpectedTotalFees =
        output.discountedExpectedNobaFee + output.discountedExpectedProcessingFee + output.discountedExpectedNetworkFee;

      const expectedQuote: CombinedNobaQuote = {
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
          quoteID: "id-1",
          fiatCurrency: "USD",
          cryptoCurrency: cryptocurrency,
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
      } as any;

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

      // ETH is rounded to "3" decimal places.
      const ethAssetAmountFieldsForRoundingInQuote = ["totalCryptoQuantity"];
      ethAssetAmountFieldsForRoundingInQuote.forEach(field => {
        expectedQuote.quote[field] = Utils.roundToSpecifiedDecimalNumber(expectedQuote.quote[field], 3);
      });

      return expectedQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 62.5,

          // WITH discounts.
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 16,
          discountedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 62.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        // All these discounts should mean that the quote & non-discounted quote remain equal
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
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

    it("Spread percentage override is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "USDC.ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          // This number is expected to be overridden by USDC.ETH spread override, so calcs below are against the override (0.01)
          spreadPercentage: 0.5,
          fiatFeeDollars: 0,
          dynamicCreditCardFeePercentage: 0,
          fixedCreditCardFee: 0,
        },
        {
          expectedNobaFee: 0,
          expectedProcessingFee: 0,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 10.1,
          amountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 99.01,

          // WITH discounts.
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10.1,
          discountedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 99.01,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "USDC.ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        // All these discounts should mean that the quote & non-discounted quote remain equal
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
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

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 90.5,
          expectedPriceAfterFeeAndSpread: 90.5,

          // WITH discounts.
          discountedExpectedNobaFee: 9.5,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedAmountPreSpread: 90.5,
          discountedExpectedPriceAfterFeeAndSpread: 90.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 87.7,
          expectedPriceAfterFeeAndSpread: 87.7,

          // WITH discounts.
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 12.3,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedAmountPreSpread: 87.7,
          discountedExpectedPriceAfterFeeAndSpread: 87.7,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 99.5,
          expectedPriceAfterFeeAndSpread: 99.5,

          // WITH discounts.
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedAmountPreSpread: 99.5,
          discountedExpectedPriceAfterFeeAndSpread: 99.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 80.9,
          expectedPriceAfterFeeAndSpread: 80.9,

          // WITH discounts.
          discountedExpectedNobaFee: 7.1,
          discountedExpectedProcessingFee: 12,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedAmountPreSpread: 80.9,
          discountedExpectedPriceAfterFeeAndSpread: 80.9,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 80.5,
          expectedPriceAfterFeeAndSpread: 40.25,

          // WITH discounts.
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 12,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 20,
          discountedAmountPreSpread: 80.5,
          discountedExpectedPriceAfterFeeAndSpread: 40.25,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("should take both dynamic & fixed credit card charges", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          amountPreSpread: 86.5,
          expectedPriceAfterFeeAndSpread: 86.5,

          // WITH discounts.
          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 13.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedAmountPreSpread: 86.5,
          discountedExpectedPriceAfterFeeAndSpread: 86.5,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
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

    it("should include 'fixedCreditCardFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.5,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 0,
          quotedCostPerUnit: 20,
          amountPreSpread: 70.5,
          // (discountedAmountPreSpread) / (1 + spread) = (75.5) / (1 + 1) = 37.5
          expectedPriceAfterFeeAndSpread: 37.75,

          // WITH discounts.
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 17,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 20,
          discountedAmountPreSpread: 75.5,
          discountedExpectedPriceAfterFeeAndSpread: 37.75,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.5,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 5,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0, // No spread discount is available
        processingFeeDiscount: 0,
      });
    });

    it("should include 'networkFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0.5,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          // (discountedAmountPreSpread) / (1 + spread) = (65.5) / (1 + 1) = 32.75
          expectedPriceAfterFeeAndSpread: 32.75,

          // WITH discounts.
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 22,
          discountedExpectedNetworkFee: 5,
          discountedQuotedCostPerUnit: 20,
          discountedAmountPreSpread: 65.5,
          discountedExpectedPriceAfterFeeAndSpread: 32.75,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0.5,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 5,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("should include 'nobaFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0.5,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          // spreadDiscount = 0, so should be equal to discountedExpectedPriceAfterFeeAndSpread
          expectedPriceAfterFeeAndSpread: 32.125,

          // WITH discounts.
          discountedExpectedNobaFee: 3.75,
          discountedExpectedProcessingFee: 22,
          discountedExpectedNetworkFee: 10,
          discountedQuotedCostPerUnit: 20,
          discountedAmountPreSpread: 64.25,
          discountedExpectedPriceAfterFeeAndSpread: 32.125, // actual = 32.125
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0.5,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 3.75,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("should include 'nobaSpreadDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0.5,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          // (discountedAmountPreSpread) / (1 + spread) = (60.5) / (1 + 1) = 30.25
          expectedPriceAfterFeeAndSpread: 30.25,

          // WITH discounts.
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 22,
          discountedExpectedNetworkFee: 10,
          discountedQuotedCostPerUnit: 15,
          discountedAmountPreSpread: 60.5,
          // (discountedAmountPreSpread) / (1 + discountedSpread) = (60.5) / (1 + 0.5) = 40.3333
          discountedExpectedPriceAfterFeeAndSpread: 40.333333,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0.5,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 10.08,
        processingFeeDiscount: 0,
      });
    });

    it("should include 'processingFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          // spreadDiscount = 0, so should be equal to discountedExpectedPriceAfterFeeAndSpread
          expectedPriceAfterFeeAndSpread: 33.25,

          // WITH discounts.
          discountedExpectedNobaFee: 7.5,
          discountedExpectedProcessingFee: 16,
          discountedExpectedNetworkFee: 10,
          discountedQuotedCostPerUnit: 20,
          discountedAmountPreSpread: 66.5,
          discountedExpectedPriceAfterFeeAndSpread: 33.25,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0.5,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 6,
      });
    });

    it("should include all the discounts correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.1,
            networkFeeDiscountPercent: 0.2,
            nobaFeeDiscountPercent: 0.3,
            nobaSpreadDiscountPercent: 0.4,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          // (discountedAmountPreSpread) / (1 + spread) = (71.75) / (1 + 1) = 35.875
          expectedPriceAfterFeeAndSpread: 35.875,

          // WITH discounts.
          discountedExpectedNobaFee: 5.25,
          discountedExpectedProcessingFee: 15,
          discountedExpectedNetworkFee: 8,
          discountedQuotedCostPerUnit: 16,
          discountedAmountPreSpread: 71.75,
          // discountedSpread = (1 - 0.4) = 0.6
          // (discountedAmountPreSpread) / (1 + discountedSpread) = (71.75) / (1 + 0.6) = 44.84375
          discountedExpectedPriceAfterFeeAndSpread: 44.84375,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          nobaSpreadDiscountPercent: 0.4,
          processingFeeDiscountPercent: 0.5,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 1,
        networkFeeDiscount: 2,
        nobaFeeDiscount: 2.25,
        spreadDiscount: 8.96,
        processingFeeDiscount: 6,
      });
    });

    it("should add 100% network fee discount for transaction type of NOBA_WALLET", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        fiatAmountUSD,
        originalCostPerUnit,
        {
          spreadPercentage: 1,
          fiatFeeDollars: 7.5,
          dynamicCreditCardFeePercentage: 0.12,
          fixedCreditCardFee: 10,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.1,
            networkFeeDiscountPercent: 1,
            nobaFeeDiscountPercent: 0.3,
            nobaSpreadDiscountPercent: 0.4,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          // Without discounts.
          expectedNobaFee: 7.5,
          expectedProcessingFee: 22,
          expectedNetworkFee: 10,
          quotedCostPerUnit: 20,
          amountPreSpread: 60.5,
          expectedPriceAfterFeeAndSpread: 39.875,

          // WITH discounts.
          discountedExpectedNobaFee: 5.25,
          discountedExpectedProcessingFee: 15,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 16,
          discountedAmountPreSpread: 79.75,
          discountedExpectedPriceAfterFeeAndSpread: 49.84,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        transactionType: TransactionType.NOBA_WALLET,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          nobaSpreadDiscountPercent: 0.4,
          processingFeeDiscountPercent: 0.5,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 1,
        networkFeeDiscount: 10,
        nobaFeeDiscount: 2.25,
        spreadDiscount: 9.96,
        processingFeeDiscount: 6,
      });
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
      cryptocurrency: string,
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

      when(zerohashService.estimateNetworkFee(cryptocurrency, "USD")).thenResolve({
        cryptoCurrency: cryptocurrency,
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(
        zerohashService.requestQuoteForDesiredCryptoQuantity(cryptocurrency, "USD", requestedCryptoQuantity),
      ).thenResolve({
        cryptoCurrency: cryptocurrency,
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "id-1",
      });

      const expectedTotalFees = output.expectedNobaFee + output.expectedProcessingFee + output.expectedNetworkFee;
      const discountedExpectedTotalFees =
        output.discountedExpectedNobaFee + output.discountedExpectedProcessingFee + output.discountedExpectedNetworkFee;

      const expectedQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "id-1",
          fiatCurrency: "USD",
          cryptoCurrency: cryptocurrency,
          amountPreSpread: output.discountedExpectedAmountPreSpread,
          processingFeeInFiat: output.discountedExpectedProcessingFee,
          networkFeeInFiat: output.discountedExpectedNetworkFee,
          nobaFeeInFiat: output.discountedExpectedNobaFee,
          quotedFiatAmount: requestedCryptoQuantity * output.discountedQuotedCostPerUnit,
          // (X - fees)/perUnitCost = cryptoQuantity
          totalFiatAmount: requestedCryptoQuantity * output.discountedQuotedCostPerUnit + discountedExpectedTotalFees,
          totalCryptoQuantity: requestedCryptoQuantity,
          perUnitCryptoPriceWithSpread: output.discountedQuotedCostPerUnit,
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
      } as any;

      // FIAT amounts are rounded to "2" decimal places.
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

      // ETH is rounded to "3" decimal places.
      const ethAssetAmountFieldsForRoundingInQuote = ["totalCryptoQuantity"];
      ethAssetAmountFieldsForRoundingInQuote.forEach(field => {
        expectedQuote.quote[field] = Utils.roundToSpecifiedDecimalNumber(expectedQuote.quote[field], 6);
      });

      return expectedQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 160 * (1 + 0.6),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const quote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
      });

      expect(quote.quote).toEqual(expectedNobaQuote.quote);
      expect(quote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(quote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 160 * (1 + 0),

          discountedExpectedNobaFee: 10,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 56.25,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 20,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 87.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 7,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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

    it("All spread, noba flat fee and credit card percentage are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 94.5,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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

    it("Network fee is taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0),

          discountedExpectedNobaFee: 0,
          discountedExpectedProcessingFee: 0,
          discountedExpectedNetworkFee: 20,
          discountedQuotedCostPerUnit: 10,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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

    it("All the parameters are taken into account correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
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
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 128,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
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

    it("should apply 'fixedCreditCardFeeDiscountPercent' correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.5,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 118,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.5,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 10,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("should apply 'networkFeeDiscountPercent' correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0.5,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 128,
          discountedExpectedNetworkFee: 2,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0.5,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 2,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("should apply 'nobaFeeDiscountPercent' correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0.5,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 4,
          discountedExpectedProcessingFee: 128,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0.5,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 4,
        spreadDiscount: 0,
        processingFeeDiscount: 0,
      });
    });

    it("should apply 'nobaSpreadDiscountPercent' correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0.5,
            processingFeeDiscountPercent: 0,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 128,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 13,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.3),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0.5,
          processingFeeDiscountPercent: 0,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 30,
        processingFeeDiscount: 0,
      });
    });

    it("should apply 'processingFeeDiscountPercent' correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 8,
          discountedExpectedProcessingFee: 74,
          discountedExpectedNetworkFee: 4,
          discountedQuotedCostPerUnit: 16,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0.5,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        nobaFeeDiscount: 0,
        spreadDiscount: 0,
        processingFeeDiscount: 54,
      });
    });

    it("should apply 'ALL' the discount percentages correctly", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.1,
            networkFeeDiscountPercent: 0.2,
            nobaFeeDiscountPercent: 0.3,
            nobaSpreadDiscountPercent: 0.4,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 5.6,
          discountedExpectedProcessingFee: 72,
          discountedExpectedNetworkFee: 3.2,
          discountedQuotedCostPerUnit: 13.6,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.ONRAMP,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          nobaSpreadDiscountPercent: 0.4,
          processingFeeDiscountPercent: 0.5,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 2,
        networkFeeDiscount: 0.8,
        nobaFeeDiscount: 2.4,
        spreadDiscount: 24,
        processingFeeDiscount: 54,
      });
    });

    it("should give 100% network fee discount when transactionType is WALLET", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        "ETH",
        cryptoQuantity,
        originalCostPerUnit,
        {
          spreadPercentage: 0.6,
          fiatFeeDollars: 8,
          dynamicCreditCardFeePercentage: 0.36,
          fixedCreditCardFee: 20,

          discount: {
            fixedCreditCardFeeDiscountPercent: 0.1,
            networkFeeDiscountPercent: 1,
            nobaFeeDiscountPercent: 0.3,
            nobaSpreadDiscountPercent: 0.4,
            processingFeeDiscountPercent: 0.5,
          },
        },
        {
          expectedNobaFee: 8,
          expectedProcessingFee: 128,
          expectedNetworkFee: 4,
          quotedCostPerUnit: 16,
          expectedAmountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),

          discountedExpectedNobaFee: 5.6,
          discountedExpectedProcessingFee: 72,
          discountedExpectedNetworkFee: 0,
          discountedQuotedCostPerUnit: 13.6,
          discountedExpectedAmountPreSpread: 100,
          discountedExpectedPriceAfterFeeAndSpread: 100 * (1 + 0.6),
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
        transactionType: TransactionType.NOBA_WALLET,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          nobaSpreadDiscountPercent: 0.4,
          processingFeeDiscountPercent: 0.5,
        },
      });

      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
      expect(nobaQuote.discountsGiven).toEqual({
        creditCardFeeDiscount: 2,
        networkFeeDiscount: 4,
        nobaFeeDiscount: 2.4,
        spreadDiscount: 24,
        processingFeeDiscount: 54,
      });
    });
  });

  describe("executeQuoteForFundsAvailability()", () => {
    it("returns a quote", async () => {
      const quoteID = "quote_id";
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

      const request: ExecuteQuoteRequest = {
        consumer: consumer.props,
        cryptoCurrency: "ETH",
        cryptoQuantity: 12345.6789,
        fiatAmount: 2,
        fiatCurrency: "USD",
        transactionType: TransactionType.ONRAMP,
        slippage: 0,
        transactionCreationTimestamp: new Date(),
        transactionID: "123456",
        fixedSide: CurrencyType.FIAT,
        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: quoteID,
          fiatCurrency: "USD",
          cryptoCurrency: request.cryptoCurrency,
          processingFeeInFiat: 2,
          amountPreSpread: 1234,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1.99,
          quotedFiatAmount: 50,
          totalFiatAmount: 50,
          totalCryptoQuantity: request.cryptoQuantity,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          processingFeeInFiat: 2,
          amountPreSpread: 1234,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1.99,
          quotedFiatAmount: 50,
          totalFiatAmount: 50,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0.111,
          networkFeeDiscount: 0.222,
          nobaFeeDiscount: 0.333,
          processingFeeDiscount: 0.444,
          spreadDiscount: 0.5555,
        },
      };

      const quote: ExecutedQuote = {
        cryptoReceived: request.cryptoQuantity,
        tradeID: "12345",
        tradePrice: 23423,
        quote: nobaQuote,
      };

      zerohashAssetService.getQuoteForSpecifiedFiatAmount = jest.fn().mockReturnValue(nobaQuote);
      when(zerohashService.executeQuote(quoteID)).thenResolve({
        tradePrice: 23423,
        cryptoReceived: request.cryptoQuantity,
        quoteID: "quote_id",
        tradeID: "12345",
        cryptocurrency: "ETH",
      });

      const quoteResponse = await zerohashAssetService.executeQuoteForFundsAvailability(request);
      expect(quoteResponse).toEqual(quote);
    });

    it("throws a BadRequestError if unknown cryptocurrency is requested", async () => {
      const quoteID = "123456";
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

      const request: ExecuteQuoteRequest = {
        consumer: consumer.props,
        cryptoCurrency: "UNKNOWN",
        cryptoQuantity: 12345.6789,
        transactionType: TransactionType.ONRAMP,
        fiatAmount: 2,
        fiatCurrency: "USD",
        slippage: 0,
        transactionCreationTimestamp: new Date(),
        transactionID: "123456",
        fixedSide: CurrencyType.FIAT,
      };

      when(currencyService.getCryptocurrency("UNKNOWN")).thenResolve(null);

      expect(async () => {
        await zerohashAssetService.executeQuoteForFundsAvailability(request);
      }).rejects.toThrowError(BadRequestError);
    });

    it("throws a BadRequestError if unknown fiat currency is requested", async () => {
      const quoteID = "123456";
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

      const request: ExecuteQuoteRequest = {
        consumer: consumer.props,
        cryptoCurrency: "ETH",
        cryptoQuantity: 12345.6789,
        fiatAmount: 2,
        transactionType: TransactionType.ONRAMP,
        fiatCurrency: "UNKNOWN",
        slippage: 0,
        transactionCreationTimestamp: new Date(),
        transactionID: "123456",
        fixedSide: CurrencyType.FIAT,
      };

      when(currencyService.getFiatCurrency("UNKNOWN")).thenResolve(null);

      expect(async () => {
        await zerohashAssetService.executeQuoteForFundsAvailability(request);
      }).rejects.toThrowError(BadRequestError);
    });
  });

  describe("makeFundsAvailable()", () => {
    it("returns funds availability response", async () => {
      const request: FundsAvailabilityRequest = {
        cryptoAmount: 12345.68783829,
        cryptocurrency: "ETH",
        transactionID: "fake-transaction-1",
      };

      const transferID = "12345";
      const response: ZerohashTransferResponse = {
        cryptoAmount: request.cryptoAmount,
        cryptocurrency: request.cryptocurrency,
        transferID: transferID,
      };

      const expectedResponse: FundsAvailabilityResponse = {
        transferID: transferID,
        transferredCrypto: request.cryptoAmount,
        cryptocurrency: request.cryptocurrency,
      };

      when(
        zerohashService.transferAssetsToNoba(request.cryptocurrency, request.cryptoAmount, "fake-transaction-1"),
      ).thenResolve(response);

      const fundsAvailabilityResponse = await zerohashAssetService.makeFundsAvailable(request);

      expect(fundsAvailabilityResponse).toEqual(expectedResponse);
    });
  });

  describe("pollFundsAvailableStatus()", () => {
    it("returns PENDING status if transfer is in APPROVED status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: ZerohashTransferStatus.APPROVED,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: null,
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({ status: PollStatus.PENDING, errorMessage: null, settledId: null });
    });

    it("returns PENDING status if transfer is in PENDING status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: ZerohashTransferStatus.PENDING,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: null,
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({ status: PollStatus.PENDING, errorMessage: null, settledId: null });
    });

    it("returns SUCCESS status if transfer is in SETTLED status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: ZerohashTransferStatus.SETTLED,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: "1111",
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({ status: PollStatus.SUCCESS, errorMessage: null, settledId: "1111" });
    });

    it("returns FATAL_ERROR status if transfer is in REJECTED status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: ZerohashTransferStatus.REJECTED,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: null,
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({
        status: PollStatus.FATAL_ERROR,
        errorMessage: `Liquidity transfer to Noba was rejected for transferId '${transferID}'`,
        settledId: null,
      });
    });

    it("returns FAILURE status if transfer is in CANCELLED status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: ZerohashTransferStatus.CANCELLED,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: null,
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({
        status: PollStatus.FAILURE,
        errorMessage: `Liquidity transfer to Noba was cancelled for transferId '${transferID}'`,
        settledId: null,
      });
    });

    it("throws an error transfer is in an unknown status", async () => {
      const transferID = "1234";

      when(zerohashService.getTransfer(transferID)).thenResolve({
        status: undefined,
        id: null,
        createdAt: null,
        updatedAt: null,
        asset: null,
        movementID: null,
      });

      const FundsAvailabilityStatus = await zerohashAssetService.pollFundsAvailableStatus(transferID);

      expect(FundsAvailabilityStatus).toEqual({
        status: PollStatus.FATAL_ERROR,
        errorMessage: `Liquidity transfer failed for '${transferID}': Unexpected Zerohash Transfer status: undefined`,
        settledId: null,
      });
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
        cryptoCurrency: "ETH",
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

      const tradeID = await zerohashAssetService.transferAssetToConsumerAccount(request);

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

      const transferStatus = await zerohashAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await zerohashAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await zerohashAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await zerohashAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
    });
  });

  describe("getConsumerAccountBalance()", () => {
    // Not really much to do here!
    it("gets the balances for the consumer", async () => {
      const zhParticipantCode = "zh-participant-code";
      const lastUpdateDate = new Date();

      when(zerohashService.getParticipantBalance(zhParticipantCode)).thenResolve([
        {
          accountGroup: "acct-group-1",
          accountID: "acct-id-1",
          accountLabel: "acct-label-1",
          accountOwner: "acct-owner-1",
          accountType: ZerohashAccountType.AVAILABLE,
          asset: "asset-1",
          balance: "1000000",
          lastUpdate: lastUpdateDate.getTime(),
        },
        {
          accountGroup: "acct-group-2",
          accountID: "acct-id-2",
          accountLabel: "acct-label-2",
          accountOwner: "acct-owner-2",
          accountType: ZerohashAccountType.AVAILABLE,
          asset: "asset-2",
          balance: "2000000",
          lastUpdate: lastUpdateDate.getTime(),
        },
      ]);

      const returnedBalanceResponse = await zerohashAssetService.getConsumerAccountBalance(zhParticipantCode);
      expect(returnedBalanceResponse).toEqual([
        {
          name: "acct-label-1",
          asset: "asset-1",
          accountType: ZerohashAccountType.AVAILABLE.toString(),
          balance: "1000000",
          accountID: "acct-id-1",
          lastUpdate: lastUpdateDate.getTime(),
        },
        {
          name: "acct-label-2",
          asset: "asset-2",
          accountType: ZerohashAccountType.AVAILABLE.toString(),
          balance: "2000000",
          accountID: "acct-id-2",
          lastUpdate: lastUpdateDate.getTime(),
        },
      ]);
    });

    it("doesn't return an error if there's no balance info", async () => {
      const zhParticipantCode = "zh-participant-code";

      when(zerohashService.getParticipantBalance(zhParticipantCode)).thenResolve([]);

      const returnedBalanceResponse = await zerohashAssetService.getConsumerAccountBalance(zhParticipantCode);
      expect(returnedBalanceResponse).toEqual([]);
    });
  });

  describe("transferToConsumerWallet()", () => {
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
          undefined,
        ),
      ).thenResolve(withdrawalID);

      const returnedWithdrawalResponse = await zerohashAssetService.transferToConsumerWallet(request);
      expect(returnedWithdrawalResponse.liquidityProviderTransactionId).toEqual(withdrawalID);
    });

    it("throws TransactionSubmissionException when zerohash request fails", async () => {
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

      when(
        zerohashService.requestWithdrawal(
          request.walletAddress,
          request.amount,
          request.assetId,
          request.consumer.zhParticipantCode,
          nobaPlatformCode,
          undefined,
        ),
      ).thenReject(new BadRequestException("Invalid wallet address"));

      expect(async () => await zerohashAssetService.transferToConsumerWallet(request)).rejects.toThrow(
        TransactionSubmissionException,
      );
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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await zerohashAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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
