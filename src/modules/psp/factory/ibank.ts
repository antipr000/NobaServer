import { IBalanceProvider } from "./ibalanceprovider";
import { IDebitProvider } from "./idebitprovider";

export interface IBank extends IBalanceProvider, IDebitProvider {}
