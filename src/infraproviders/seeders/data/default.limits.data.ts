import { AppEnvironment } from "src/config/ConfigurationUtils";
import { Limits } from "../../../modules/transactions/domain/LimitProfile";

export interface EnvironmentLimitMap {
  [AppEnvironment.DEV]: Limits;
  [AppEnvironment.AWSDEV]: Limits;
  [AppEnvironment.E2E_TEST]: Limits;
  [AppEnvironment.PARTNER]: Limits;
  [AppEnvironment.PROD]: Limits;
  [AppEnvironment.SANDBOX]: Limits;
  [AppEnvironment.STAGING]: Limits;
}

export interface EnvironmentExposureMap {
  [AppEnvironment.DEV]: number;
  [AppEnvironment.AWSDEV]: number;
  [AppEnvironment.E2E_TEST]: number;
  [AppEnvironment.PARTNER]: number;
  [AppEnvironment.PROD]: number;
  [AppEnvironment.SANDBOX]: number;
  [AppEnvironment.STAGING]: number;
}

export const environmentToDefaultCardLimitsMap: EnvironmentLimitMap = {
  [AppEnvironment.DEV]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.AWSDEV]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.E2E_TEST]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.PARTNER]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.PROD]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.SANDBOX]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.STAGING]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
};

export const environmentToDefaultBankLimitsMap: EnvironmentLimitMap = {
  [AppEnvironment.DEV]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.AWSDEV]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.E2E_TEST]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.PARTNER]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.PROD]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.SANDBOX]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
  [AppEnvironment.STAGING]: {
    minTransaction: 5,
    maxTransaction: 50,
    daily: 200,
    weekly: 1000,
    monthly: 2000,
  },
};

export const environmentToDefaultTransactionExposureMap: EnvironmentExposureMap = {
  [AppEnvironment.DEV]: 100,
  [AppEnvironment.AWSDEV]: 100,
  [AppEnvironment.E2E_TEST]: 100,
  [AppEnvironment.PARTNER]: 100,
  [AppEnvironment.PROD]: 100,
  [AppEnvironment.SANDBOX]: 100,
  [AppEnvironment.STAGING]: 100,
};
