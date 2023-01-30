import { join } from "path";

// Note that these are the variables required for even "loading" the code inside "server.ts"
export const setUpEnvironmentVariablesToLoadTheSourceCode = (): number => {
  const port = 9000 + Math.floor(Math.random() * 2000);

  process.env.PORT = `${port}`;
  process.env.NODE_ENV = "e2e_test";
  process.env.CONFIGS_DIR = join(__dirname, "../appconfigs");
  process.env.SERVER_BASE_URL = `http://localhost:${port}`;

  return port;
};
