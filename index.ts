import * as DatabaseConfig from "./databaseConfig.json";
import * as DatabaseTypes from "./src/database/types/";
import { Database } from "./src/database";
import { Collection } from "mongodb";
import { router as itemRouter } from "./src/item";
import express from "express";

const app = express();

export type CosmeticCollections = {
  items: Collection<DatabaseTypes.Item>;
};

export type CosmeticDatabase = Database<CosmeticCollections>;

(async (): Promise<void> => {
  if (process.env.ACCOUNT_AUTH_TOKEN === undefined) {
    throw new Error("Authentication token is required. Set environment variable: ACCOUNT_AUTH_TOKEN");
  }

  (global as any).database = await Database.connect<CosmeticCollections>(DatabaseConfig.url, DatabaseConfig.databaseName, { items: undefined as any });

  app.use("/item", itemRouter);

  app.listen(2219);
})();
