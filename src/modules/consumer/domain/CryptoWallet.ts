import { WalletStatus } from "./VerificationStatus";

export type CryptoWallet = {
  walletName?: string;
  address: string;
  chainType?: string;
  isEVMCompatible?: boolean;
  status: WalletStatus;
  partnerID?: string;
  riskScore?: number;
};

// Sourced from: https://docs.google.com/spreadsheets/d/1zndoaJTJNS70Ow0LXc2NWAhvaOQkyFZAEOXHjwM7-qk/edit?usp=sharing
export const SANCTIONED_WALLETS: string[] = [
  "3K35dyL85fR9ht7UgzPfd1gLRRXQtNTqE3",
  "3Q5dGfLKkWqWSwYtbMUyc8xGjN5LrRviK4",
  "3EPqGUw2q89pwPZ1UF8FJspE2AyojSTjdu",
  "3LhnVMcBq4gsR7aDaRr9XmUo17CuYBV4FN",
  "3F6bbvS1krsc1qR8FsbTDfYQyvkMm3QvmR",
  "3JHMz3mTna1gVCZSPp8NgRFiY7phkv5mA8",
  "32DaxSzUhLBHY2WGSWQYiBSHnRsfQZrrRp",
  "3MTRvM5QrYZHKo8gh5qKcrPK3RLjxcDCZE",
  "34pFGsSYbWEritXncW9unZtQQE9dKSvKku",
  "38ncxqt932N9CcfNfYuHGZgCyR85hDkWBW",
  "3F6bbvS1krsc1qR8FsbTDfYQyvkMm3QvmR",
  "3MD3riFB6U8PykypF6qkvSj8R2SGdUDPn3",
  "3JUwAS7seL3fh5hxWh9fu3HCiEzjuQLTfg",
  "3EUjqe9UpmyXCFd6jeu69hoTzndMRfxw9M",
  "3QEjBiPzw6WZUL4MYMmMU6DY1Y25aVbpQu",
  "3N3YSDvp4cbhEgNGabQxTN39kEzJmwG8Ah",
  "3J19qffPT6mxQUcV6k5yVURGZtdhpdGr4y",
  "33KKjn4exdBJQkTtdWxqpdVsWxrw3LareG",
  "3GSXNXzyCDoQ1Rhsc7F1jjjFe7DGcHHdcM",
  "3QJyT8nThEQakbfqgX86YjCK1Sp9hfNCUW",
  "35hh9dg3wSvUJz9vFk1FsezLE5Fx3Hudk2",
  "3NDzzVxiLBUs1WPvVGRfCYDTAD2Ua2PvW4",
  "3DCCgmyKozcZkFBzYb1A2x8abZCpAUTPPk",
  "3MvQ4gThF4mmuo49p4dBNchcmFHBRZnYfx",
  "3FBgeJdhiBe22UoSpp51Vd8dPHVa2A4wZX",
  "3HQDRyzwm82MFmLWtmyikDM9JQEtVT6vAp",
  "31t4nEpcwyQJT1VuXdAoQZTT5givRDPsNP",
  "39AALn7eTjdPzLb99hHhD6F7J8QWB3R2Rd",
  "3LDbNuDkKmLae5r3a5icPA5CQg2Y8F7ogW",
  "3JLyyLbwciWAC6re87D7mRknXakR4YbnUd",
  "3ANWhUnHujdwbw2jEuGSRH6bvFsD9BqEy9",
  "32fbAZMTaQxNd2fAue1PgsiPgWfcsHBQQt",
  "3HupEUfKmMhvhXqf8TMoPAyqDcRC1kpe65",
  "34kEYgpijvCmjvahRXXQEnBH76UGJVx2wg",
  "3GYbbYkvqvjF5oYhaKCgQYCvcVE1JENk6J",
  "3BazbaTP8ELJUEfPBV9z5HXEdgBziV9p7W",
  "3GMfGEDYMTq9G8dEHet1zLtUFJwYwSNa3Y",
  "38LjCapRrJEW7w2zwbyS15P9D9UGPjWS44",
  "36XqYWGvUQwBrYLRVuegN4pJJJSPWL1WEu",
  "37g6WgqedzZx6nx51tYgssNG8Hnknyj5nL",
  "3QAdoc1rDCt8dii1GVPJXvvK6CEJLzCRZw",
  "32PsiT8itBrEF84ebdaF82yBUEcz5Wc6uY",
  "3B4G1M8eF3cThbeMwhEWkKzczw9QoNTGak",
  "34ETiHfQWEYFCCaXmEeQWVmhFH5vz2JMvd",
  "3PyzSbFj3hbQQjTzDzyLSgvFVDjB7yw4Cj",
  "15PggTG7YhJKiE6B16vkKzA1YDTZipXEX4",
  "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  "0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B",
  "0x3Cffd56B47B7b41c56258D9C7731ABaDc360E073",
  "0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1",
  "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  "0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B",
  "0x3Cffd56B47B7b41c56258D9C7731ABaDc360E073",
  "0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1",
  "0x35fB6f6DB4fb05e6A4cE86f2C93691425626d4b1",
  "0xF7B31119c2682c88d88D455dBb9d5932c65Cf1bE",
  "0x3e37627dEAA754090fBFbb8bd226c1CE66D255e9",
  "0x08723392Ed15743cc38513C4925f5e6be5c17243",
  "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
  "0x722122dF12D4e14e13Ac3b6895a86e84145b6967",
  "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384",
  "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
  "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307",
  "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D",
  "0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3",
  "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF",
  "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291",
  "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144",
  "0xF60dD140cFf0706bAE9Cd734Ac3ae76AD9eBC32A",
  "0x22aaA7720ddd5388A3c0A3333430953C68f1849b",
  "0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659",
  "0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00",
  "0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce",
  "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2",
  "0xD691F27f38B395864Ea86CfC7253969B409c362d",
  "0xaEaaC358560e11f52454D997AAFF2c5731B6f8a6",
  "0x1356c899D8C9467C7f71C195612F8A395aBf2f0a",
  "0xA60C772958a3eD56c1F15dD055bA37AC8e523a0D",
  "0x169AD27A470D064DEDE56a2D3ff727986b15D52B",
  "0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f",
  "0xF67721A2D8F736E75a49FdD7FAd2e31D8676542a",
  "0x9AD122c22B14202B4490eDAf288FDb3C7cb3ff5E",
  "0x905b63Fff465B9fFBF41DeA908CEb12478ec7601",
  "0x07687e702b410Fa43f4cB4Af7FA097918ffD2730",
  "0x94A1B5CdB22c43faab4AbEb5c74999895464Ddaf",
  "0xb541fc07bC7619fD4062A54d96268525cBC6FfEF",
  "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc",
  "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936",
  "0x23773E65ed146A459791799d01336DB287f25334",
  "0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af",
  "0x610B717796ad172B316836AC95a2ffad065CeaB4",
  "0x178169B423a011fff22B9e3F3abeA13414dDD0F1",
  "0xbB93e510BbCD0B7beb5A853875f9eC60275CF498",
  "0x2717c5e28cf931547B621a5dddb772Ab6A35B701",
  "0x03893a7c7463AE47D46bc7f091665f1893656003",
  "0xCa0840578f57fE71599D29375e16783424023357",
  "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2",
  "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
  "0x722122dF12D4e14e13Ac3b6895a86e84145b6967",
  "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384",
  "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
  "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307",
  "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D",
  "1H939dom7i4WDLCKyGbXUp3fs9CSTNRzgL",
  "bc1q3y5v2khlyvemcz042wl98dzflywr8ghglqws6s",
  "bc1qx3e2axj3wsfn0ndtvlwmkghmmgm4583nqg8ngk",
  "bc1qsxf77cvwcd6jv6j8d8j3uhh4g0xqw4meswmw",
  "bc1q9lvynkfpaw330uhqmunzdz6gmafsvapv7y3zty",
  "bc1qpaly5nm7pfka9v92d6qvl4fc2l9xzee8a6ys3s",
];
