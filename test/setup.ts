import { join } from "path";

export const setUp = () => {
  const port = 9000 + Math.floor(Math.random() * 1000);

  process.env.PORT = `${port}`;
  process.env.NODE_ENV = "e2e_test";
  process.env.CONFIGS_DIR = join(__dirname, "../appconfigs");
  process.env.SERVER_BASE_URL = `http://localhost:${port}`;
};
