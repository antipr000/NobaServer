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
import { SwapAssetService } from "../../assets/swap.asset.service";
import { SwapServiceProvider } from "../../domain/swap.service.provider";
import { getMockSquidServiceWithDefaults } from "../../mocks/mock.squid.service";
import { TransactionType } from "../../domain/Types";

describe("SwapAssetService", () => {
  let zerohashService: ZeroHashService;
  let currencyService: CurrencyService;
  let usdcPolygonAssetService: USDCPolygonAssetService;
  let swapAssetService: SwapAssetService;
  let swapServiceProvider: SwapServiceProvider;
  const nobaPlatformCode = "ABCDE";
  const REQUESTED_CRYPTO_ASSET = "axlUSDCMoonbeam";

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    zerohashService = getMockZerohashServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    swapServiceProvider = getMockSquidServiceWithDefaults();

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

    swapAssetService = new SwapAssetService(instance(swapServiceProvider), usdcPolygonAssetService);

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
      cryptoQuantity: number,
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

      const quotedFiatAmount =
        output.expectedPriceAfterFeeAndSpread +
        (output.discountedExpectedPriceAfterFeeAndSpread - output.expectedPriceAfterFeeAndSpread);
      const totalCryptoQuantity = (requestedFiatAmount - discountedExpectedTotalFees) / output.quotedCostPerUnit;
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
          cryptoCurrency: REQUESTED_CRYPTO_ASSET,
          amountPreSpread: output.amountPreSpread,
          processingFeeInFiat: output.expectedProcessingFee,
          networkFeeInFiat: output.expectedNetworkFee,
          nobaFeeInFiat: output.expectedNobaFee,
          quotedFiatAmount: quotedFiatAmount,
          totalFiatAmount: requestedFiatAmount,
          totalCryptoQuantity: totalCryptoQuantity,
          perUnitCryptoPriceWithSpread: cryptoQuantity / requestedFiatAmount,
          perUnitCryptoPriceWithoutSpread: cryptoQuantity / output.discountedExpectedPriceAfterFeeAndSpread,
        },
      } as any;

      return nobaQuote;
    };

    it("Noba spread percentage is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;
      const cryptoQuantity = 0.123;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        cryptoQuantity,
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

      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, expectedNobaQuote.quote.totalCryptoQuantity),
      ).thenResolve({
        smartContractData: "fake-smart-contract-data",
        assetQuantity: cryptoQuantity,
        exchangeRate: 1,
      });

      expectedNobaQuote.quote.totalCryptoQuantity = cryptoQuantity;

      const nobaQuote: CombinedNobaQuote = await swapAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: REQUESTED_CRYPTO_ASSET,
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        intermediateCryptoCurrency: "USDC.POLYGON",
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
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;
      const cryptoQuantity = 0.123;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        cryptoQuantity,
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

      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, expectedNobaQuote.quote.totalCryptoQuantity),
      ).thenResolve({
        smartContractData: "fake-smart-contract-data",
        assetQuantity: cryptoQuantity,
        exchangeRate: 1,
      });

      expectedNobaQuote.quote.totalCryptoQuantity = cryptoQuantity;

      const nobaQuote: CombinedNobaQuote = await swapAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: REQUESTED_CRYPTO_ASSET,
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        intermediateCryptoCurrency: "USDC.POLYGON",
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
    });

    it("Noba 'dynamic' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;
      const cryptoQuantity = 0.123;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        cryptoQuantity,
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

      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, expectedNobaQuote.quote.totalCryptoQuantity),
      ).thenResolve({
        smartContractData: "fake-smart-contract-data",
        assetQuantity: cryptoQuantity,
        exchangeRate: 1,
      });

      expectedNobaQuote.quote.totalCryptoQuantity = cryptoQuantity;

      const nobaQuote: CombinedNobaQuote = await swapAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: REQUESTED_CRYPTO_ASSET,
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        intermediateCryptoCurrency: "USDC.POLYGON",
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
    });

    it("Noba 'fixed' credit card fee is taken into account correctly", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;
      const cryptoQuantity = 0.123;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        cryptoQuantity,
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

      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, expectedNobaQuote.quote.totalCryptoQuantity),
      ).thenResolve({
        smartContractData: "fake-smart-contract-data",
        assetQuantity: cryptoQuantity,
        exchangeRate: 1,
      });

      expectedNobaQuote.quote.totalCryptoQuantity = cryptoQuantity;

      const nobaQuote: CombinedNobaQuote = await swapAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: REQUESTED_CRYPTO_ASSET,
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        intermediateCryptoCurrency: "USDC.POLYGON",
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
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const fiatAmountUSD = 100;
      const originalCostPerUnit = 1;
      const cryptoQuantity = 0.123;

      const expectedNobaQuote: CombinedNobaQuote = await setupTestAndGetQuoteResponse(
        fiatAmountUSD,
        originalCostPerUnit,
        cryptoQuantity,
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
          discountedAmountPreSpread: 90.9,
          discountedExpectedPriceAfterFeeAndSpread: 80.9,
        },
      );

      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, expectedNobaQuote.quote.totalCryptoQuantity),
      ).thenResolve({
        smartContractData: "fake-smart-contract-data",
        assetQuantity: cryptoQuantity,
        exchangeRate: 1,
      });

      expectedNobaQuote.quote.totalCryptoQuantity = cryptoQuantity;
      //expectedNobaQuote.quote.perUnitCryptoPriceWithSpread = fiatAmountUSD / cryptoQuantity;

      const nobaQuote: CombinedNobaQuote = await swapAssetService.getQuoteForSpecifiedFiatAmount({
        cryptoCurrency: REQUESTED_CRYPTO_ASSET,
        fiatCurrency: "USD",
        fiatAmount: fiatAmountUSD,
        intermediateCryptoCurrency: "USDC.POLYGON",
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
        quotedFiatAmount: Utils.roundTo2DecimalNumber(
          requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
        ),
        // (X - fees)/perUnitCost = cryptoQuantity
        totalFiatAmount: Utils.roundTo2DecimalNumber(
          requestedCryptoQuantity * output.quotedCostPerUnit + expectedTotalFees,
        ),
        totalCryptoQuantity: requestedCryptoQuantity,
        perUnitCryptoPriceWithSpread: output.quotedCostPerUnit,
        perUnitCryptoPriceWithoutSpread: originalCostPerUnit,
      };
    };

    it("should throw error as it is not supported", async () => {
      const cryptoQuantity = 10;
      const originalCostPerUnit = 1;

      await setupTestAndGetQuoteResponse(
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

      try {
        await swapAssetService.getQuoteForSpecifiedCryptoQuantity({
          cryptoCurrency: REQUESTED_CRYPTO_ASSET,
          fiatCurrency: "USD",
          cryptoQuantity: cryptoQuantity,
          transactionType: TransactionType.ONRAMP,
          discount: {
            fixedCreditCardFeeDiscountPercent: 0,
            networkFeeDiscountPercent: 0,
            nobaFeeDiscountPercent: 0,
            nobaSpreadDiscountPercent: 0,
            processingFeeDiscountPercent: 0,
          },
        });
      } catch (e) {
        expect(e.message).toBe(`Fixed side crypto is not supported for ${REQUESTED_CRYPTO_ASSET}`);
      }
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
            amountPreSpread: 500,
            fiatCurrency: "USD",
            networkFeeInFiat: 0,
            nobaFeeInFiat: 0,
            perUnitCryptoPriceWithSpread: 1.6,
            perUnitCryptoPriceWithoutSpread: 1,
            processingFeeInFiat: 0,
            quotedFiatAmount: 312.5,
            totalFiatAmount: 500,
          },
          quote: {
            amountPreSpread: 500,
            cryptoCurrency: "USDC.POLYGON",
            fiatCurrency: "USD",
            networkFeeInFiat: 0,
            nobaFeeInFiat: 0,
            perUnitCryptoPriceWithSpread: 1.6,
            perUnitCryptoPriceWithoutSpread: 1,
            processingFeeInFiat: 0,
            quoteID: "FIXED",
            quotedFiatAmount: 312.5,
            totalCryptoQuantity: 312.5,
            totalFiatAmount: 500,
          },
        },
      };

      const quoteResponse = await swapAssetService.executeQuoteForFundsAvailability(request);
      expect(quoteResponse).toEqual(quote);
    });
  });

  describe("pollExecuteQuoteForFundsAvailabilityStatus()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await swapAssetService.pollExecuteQuoteForFundsAvailabilityStatus("fake-id");
      }).rejects.toThrowError(Error);
    });
  });

  describe("makeFundsAvailable()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await swapAssetService.makeFundsAvailable({
          cryptocurrency: "USDC.POLYGON",
          cryptoAmount: 1,
          transactionID: "fake-transaction-1",
        });
      }).rejects.toThrowError(Error);
    });
  });

  describe("pollFundsAvailableStatus()", () => {
    it("throws an error when called", async () => {
      expect(async () => {
        await swapAssetService.pollFundsAvailableStatus("fake-id");
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

      const tradeID = await swapAssetService.transferAssetToConsumerAccount(request);

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

      const transferStatus = await swapAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await swapAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await swapAssetService.pollAssetTransferToConsumerStatus(tradeID);

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

      const transferStatus = await swapAssetService.pollAssetTransferToConsumerStatus(tradeID);

      expect(transferStatus).toEqual(expectedConsumerAccountTransferStatus);
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
        assetId: REQUESTED_CRYPTO_ASSET,
        transactionID: "XXXX",
        walletAddress: "YYYY",
        consumer: consumer.props,
      };

      const withdrawalID = "12345";

      const fakeSmartContractData = "fake-smart-contract-data";
      when(
        swapServiceProvider.performRouting(REQUESTED_CRYPTO_ASSET, request.amount, request.walletAddress),
      ).thenResolve({
        assetQuantity: 123,
        smartContractData: fakeSmartContractData,
        exchangeRate: 1,
      });

      when(swapServiceProvider.getIntermediaryLeg()).thenReturn("USDC.POLYGON");
      when(zerohashService.getNobaPlatformCode()).thenReturn("fake-platform-code");

      when(
        zerohashService.requestWithdrawal(
          request.walletAddress,
          request.amount,
          "USDC.POLYGON",
          request.consumer.zhParticipantCode,
          "fake-platform-code",
          fakeSmartContractData,
        ),
      ).thenResolve(withdrawalID);

      const returnedWithdrawalResponse = await swapAssetService.transferToConsumerWallet(request);
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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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

      const transferStatus = await swapAssetService.pollConsumerWalletTransferStatus(withdrawalID);

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
