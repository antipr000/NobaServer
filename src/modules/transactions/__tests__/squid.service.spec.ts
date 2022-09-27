class MockSquid {
  public static config;
  public static getRouteRequest;

  private readonly tokens;

  private readonly chains;

  constructor(config) {
    MockSquid.config = config;

    this.chains = [
      {
        chainName: "Avalanche",
        chainType: "evm",
        rpc: "https://api.avax-test.network/ext/bc/C/rpc",
        networkName: "Avalanche FUJI C-Chain Testnet",
        chainId: 43113,
        nativeCurrency: {
          name: "Avalanche",
          symbol: "AVAX",
          decimals: 18,
          icon: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
          estimatedGas: 300000,
        },
        blockExplorerUrls: [],
        chainNativeContracts: {
          wrappedNativeToken: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
          distributionEnsExecutable: "0xf6Da84C51b5C82039E9E3c64ccb3F1b05d7EF1Be",
          ensRegistry: "0xa7eebb2926d22d34588497769889cbc2be0a5d97",
          multicall: "0x3D015943d2780fE97FE3f69C97edA2CCC094f78c",
        },
        squidConfig: [
          { type: "singleSwap", chainId: 1, gasUsage: 3000000 },
          { type: "doubleSwap", chainId: 1, gasUsage: 6000000 },
        ],
        axelarContracts: {
          gateway: "0xC249632c2D40b9001FE907806902f63038B737Ab",
          forecallable: "",
        },
        squidContracts: {
          squidMain: "0x5D2422453eF21A394ad87B57Fb566d0F67C4b113",
          defaultCrosschainToken: "0x57f1c63497aee0be305b8852b354cec793da43bb",
        },
        integrationContracts: {
          dexUniswapV2: "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921",
          dexCurve: "",
        },
      },
      {
        chainName: "Moonbeam",
        chainType: "evm",
        rpc: "https://rpc.api.moonbase.moonbeam.network",
        networkName: "Moonbase Alpha Testnet",
        chainId: 1287,
        nativeCurrency: {
          name: "Moonbeam",
          symbol: "GLMR",
          decimals: 18,
          icon: "https://assets.coingecko.com/coins/images/22459/small/glmr.png?1641880985",
          estimatedGas: 300000,
        },
        blockExplorerUrls: [],
        chainNativeContracts: {
          wrappedNativeToken: "0x372d0695E75563D9180F8CE31c9924D7e8aaac47",
          distributionEnsExecutable: "0xD05180187165eED557c90AB907D1C0B1dd35bDD6",
          ensRegistry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
          multicall: "0x4E2cfca20580747AdBA58cd677A998f8B261Fc21",
        },
        squidConfig: [
          { type: "singleSwap", chainId: 1, gasUsage: 3000000 },
          { type: "doubleSwap", chainId: 1, gasUsage: 6000000 },
        ],
        axelarContracts: {
          gateway: "0x5769D84DD62a6fD969856c75c7D321b84d455929",
          forecallable: "",
        },
        squidContracts: {
          squidMain: "0x5D2422453eF21A394ad87B57Fb566d0F67C4b113",
          defaultCrosschainToken: "0xd1633f7fb3d716643125d6415d4177bc36b7186b",
        },
        integrationContracts: {
          dexUniswapV2: "0xF75F62464fb6ae6E7088b76457E164EeCfB07dB4",
          dexCurve: "",
        },
      },
    ];

    this.tokens = [
      {
        chainId: 1287,
        address: "0xd1633f7fb3d716643125d6415d4177bc36b7186b",
        name: "Axelar USD Coin",
        symbol: "aUSDC",
        decimals: 6,
        commonKey: "uausdc",
        crosschain: true,
        logoURI: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
        coingeckoId: "axlusdc",
      },
      {
        chainId: 43113,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        name: "Avalanche",
        symbol: "AVAX",
        decimals: 18,
        crosschain: false,
        commonKey: "avax",
        logoURI:
          "https://raw.githubusercontent.com/pangolindex/tokens/main/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo_24.png",
        coingeckoId: "avalanche-2",
      },
    ];
  }

  async getRoute(params) {
    MockSquid.getRouteRequest = params;
    return {
      route: {
        estimate: {
          fromAmount: "50000000000000",
          sendAmount: "8113",
          toAmount: "8113",
          toAmountMin: "0",
          exchangeRate: "162.26",
        },
        transactionRequest: {
          routeType: "TRADE_SEND",
          targetAddress: "0x5D2422453eF21A394ad87B57Fb566d0F67C4b113",
          gasReceiver: false,
          data: "0x6cd08767000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002d79883d200000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000094176616c616e6368650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a307863304330613838446443363738324330344664303035323637436231376531434430644430353735000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005615553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000526f0a95edc3df4cbdb7bb37d4f7ed451db8e369000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000e47ff36ab5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000005d2422453ef21a394ad87b57fb566d0f67c4b113000000000000000000000000000000000000000000000000000001833ce52a370000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000526f0a95edc3df4cbdb7bb37d4f7ed451db8e36900000000000000000000000000000000000000000000000000000000",
          destinationChainGas: 3000000,
        },
        params: {
          recipientAddress: "0xc0C0a88DdC6782C04Fd005267Cb17e1CD0dD0575",
          sourceChainId: 3,
          sourceTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          sourceAmount: 50000000000000,
          destinationChainId: 43113,
          destinationTokenAddress: "0x57f1c63497aee0be305b8852b354cec793da43bb",
          slippage: 1,
        },
      },
    };
  }

  async init(): Promise<void> {
    return;
  }
}

jest.mock("@0xsquid/sdk", () => {
  return {
    Squid: MockSquid,
  };
});

import { Test, TestingModule } from "@nestjs/testing";

import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";

import { SquidService } from "../squid.service";
import Web3 from "web3";
import { BadRequestException } from "@nestjs/common";
const web3 = new Web3();

describe("SquidService", () => {
  let squidService: SquidService;

  jest.setTimeout(20000);

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [SquidService],
    }).compile();
    squidService = app.get<SquidService>(SquidService);
  };

  beforeAll(async () => {
    await setupTestModule({
      squid: {
        apiKey: "testApiKey",
        baseUrl: "https://testnet.api.0xsquid.com/",
        intermediaryLeg: "AVAX",
        temporaryWalletAddress: "0xDb933AE704a2D8acF4201D75106464b30dEC1E4e",
        slippage: 1,
      },
    });
  });

  it("should return intermediary leg", () => {
    expect(squidService.getIntermediaryLeg()).toBe("AVAX");
  });

  it("should call getRoute API for squid with proper parameters", async () => {
    const response = await squidService.performRouting("aUSDC.Moonbeam", 1);
    expect(response.smartContractData).toBeTruthy();
    expect(response.assetQuantity).toBeTruthy();
    expect(MockSquid.config).toStrictEqual({
      baseUrl: "https://testnet.api.0xsquid.com/",
    });
    expect(MockSquid.getRouteRequest).toStrictEqual({
      sourceChainId: 43113,
      destinationChainId: 1287,
      sourceTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      destinationTokenAddress: "0xd1633f7fb3d716643125d6415d4177bc36b7186b",
      sourceAmount: `${convertCryptoAmountToSquidAmount(1)}`,
      recipientAddress: "0xDb933AE704a2D8acF4201D75106464b30dEC1E4e",
      slippage: 1,
    });
  });

  it("throws BadRequestException when source asset is not of form Ticker.Chain", async () => {
    try {
      await squidService.performRouting("aUSDC", 1);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.message).toBe("Malformed ticker symbol: aUSDC");
    }
  });

  it("throws BadRequestException when chain is not supported", async () => {
    try {
      await squidService.performRouting("aUSDC.FakeChain", 1);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.message).toBe("Chain FakeChain not supported");
    }
  });

  it("throws BadRequestException when token is not supported", async () => {
    try {
      await squidService.performRouting("fakeToken.Moonbeam", 1);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.message).toBe("Ticker fakeToken not supported on chain Moonbeam");
    }
  });
});

function convertCryptoAmountToSquidAmount(amount: number): string {
  return web3.utils.toWei(amount.toString(), "ether");
}
