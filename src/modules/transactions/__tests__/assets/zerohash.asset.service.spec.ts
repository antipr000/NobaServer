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
  ZerohashTransferResponse,
  ZerohashTransferStatus,
} from "../../domain/ZerohashTypes";
import { Consumer } from "../../../consumer/domain/Consumer";
import { BadRequestError } from "../../../../core/exception/CommonAppException";
import { CurrencyType } from "../../../common/domain/Types";
import { getMockCurrencyServiceWithDefaults } from "../../../common/mocks/mock.currency.service";
import { CurrencyService } from "../../../common/currency.service";
import { ZerohashAssetService } from "../../assets/zerohash.asset.service";

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

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: output.expectedNetworkFee,
      });
      when(
        zerohashService.requestQuoteForFixedFiatCurrency("ETH", "USD", output.discountedExpectedPriceAfterFeeAndSpread),
      ).thenResolve({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        expireTimestamp: Date.now(),
        perUnitCryptoAssetCost: originalCostPerUnit,
        quoteID: "id-1",
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
          quoteID: "id-1",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread: output.discountedAmountPreSpread,
          processingFeeInFiat: output.discountedExpectedProcessingFee,
          networkFeeInFiat: output.discountedExpectedNetworkFee,
          totalCryptoQuantity: (requestedFiatAmount - discountedExpectedTotalFees) / output.quotedCostPerUnit,
          nobaFeeInFiat: output.discountedExpectedNobaFee,
          quotedFiatAmount:
            output.expectedPriceAfterFeeAndSpread +
            (output.discountedExpectedPriceAfterFeeAndSpread - output.expectedPriceAfterFeeAndSpread),
          totalFiatAmount: requestedFiatAmount,
          perUnitCryptoPriceWithSpread: output.discountedQuotedCostPerUnit,
          perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
        },
      };

      return nobaQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("should take both dynamic & fixed credit card charges", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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

        discount: {
          fixedCreditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          nobaSpreadDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
        },
      });
      expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    });

    it("should include 'fixedCreditCardFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 35.25,

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
    });

    it("should include 'networkFeeDiscountPercent' correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
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
          expectedPriceAfterFeeAndSpread: 30.25,

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
    });

    // it("should include 'nobaFeeDiscountPercent' correctly", async () => {
    //   const fiatAmountUSD = 100;
    //   const originalCostPerUnit = 10;

    //   const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
    //     fiatAmountUSD,
    //     originalCostPerUnit,
    //     {
    //       spreadPercentage: 1,
    //       fiatFeeDollars: 7.5,
    //       dynamicCreditCardFeePercentage: 0.12,
    //       fixedCreditCardFee: 10,

    //       fixedCreditCardFeeDiscountPercent: 0,
    //       networkFeeDiscountPercent: 0,
    //       nobaFeeDiscountPercent: 0.5,
    //       nobaSpreadDiscountPercent: 0,
    //       processingFeeDiscountPercent: 0,
    //     },
    //     {
    //       // Without discounts.
    //       expectedNobaFee: 7.5,
    //       expectedProcessingFee: 22,
    //       expectedNetworkFee: 10,
    //       quotedCostPerUnit: 20,
    //       amountPreSpread: 60.5,
    //       expectedPriceAfterFeeAndSpread: 30.25,

    //       // WITH discounts.
    //       discountedExpectedNobaFee: 3.75,
    //       discountedExpectedProcessingFee: 22,
    //       discountedExpectedNetworkFee: 10,
    //       discountedQuotedCostPerUnit: 20,
    //       discountedAmountPreSpread: 64.25,
    //       discountedExpectedPriceAfterFeeAndSpread: 32.13,  // actual = 32.125
    //     },
    //   );

    //   const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
    //     cryptoCurrency: "ETH",
    //     fiatCurrency: "USD",
    //     fiatAmount: fiatAmountUSD,

    //     fixedCreditCardFeeDiscountPercent: 0,
    //     networkFeeDiscountPercent: 0,
    //     nobaFeeDiscountPercent: 0.5,
    //     nobaSpreadDiscountPercent: 0,
    //     processingFeeDiscountPercent: 0,
    //   });
    //   expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
    //   expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
    // });

    /* it("Fee discounts are correctly applied", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 10;

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
          quotedCostPerUnit: 12.4,
          amountPreSpread: 100,
          expectedPriceAfterFeeAndSpread: 80.65,
        },
      );

      const nobaQuote: CombinedNobaQuote = await zerohashAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD, // Discounted amount

        fixedCreditCardFeeDiscountPercent: 0.1,
        networkFeeDiscountPercent: 0.2,
        nobaFeeDiscountPercent: 0.3,
        nobaSpreadDiscountPercent: 0.4,
        processingFeeDiscountPercent: 0.5,
      });
      //expect(nobaQuote.quote).toEqual(expectedNobaQuote.quote);
      expect(nobaQuote.nonDiscountedQuote).toEqual(expectedNobaQuote.nonDiscountedQuote);
    });*/
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
        amountPreSpread: output.expectedAmountPreSpread,
        processingFeeInFiat: output.expectedProcessingFee,
        networkFeeInFiat: output.expectedNetworkFee,
        nobaFeeInFiat: output.expectedNobaFee,
        quotedFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit,
        // (X - fees)/perUnitCost = cryptoQuantity
        totalFiatAmount: requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
        totalCryptoQuantity: requestedCryptoQuantity,
        perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
        perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
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
          expectedAmountPreSpread: 160,
          expectedAmountPostSpread: 160 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 100,
          expectedAmountPostSpread: 160 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 100,
          expectedAmountPostSpread: 160 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 100,
          expectedAmountPostSpread: 160 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 100,
          expectedAmountPostSpread: 160 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 160,
          expectedAmountPostSpread: 160 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 160,
          expectedAmountPostSpread: 160 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 100,
          expectedAmountPostSpread: 160 * (1 + 0),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
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
          expectedAmountPreSpread: 160,
          expectedAmountPostSpread: 160 * (1 + 0.6),
        },
      );

      const nobaQuote: NobaQuote = await zerohashAssetService.getQuoteForSpecifiedCryptoQuantity({
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: cryptoQuantity,
      });
      expect(nobaQuote).toEqual(expectedNobaQuote);
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

      const quote: ExecutedQuote = {
        cryptoReceived: request.cryptoQuantity,
        tradeID: "12345",
        tradePrice: 23423,
        quote: {
          quoteID: "quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread: 1234,
          processingFeeInFiat: 2,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1.99,
          quotedFiatAmount: 50,
          totalFiatAmount: 50,
          totalCryptoQuantity: 12345.6789,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
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

      when(zerohashService.transferAssetsToNoba(request.cryptocurrency, request.cryptoAmount)).thenResolve(response);

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
          undefined,
        ),
      ).thenResolve(withdrawalID);

      const returnedWithdrawalResponse = await zerohashAssetService.transferToConsumerWallet(request);
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
