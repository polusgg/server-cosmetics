import * as DatabaseConfig from "./databaseConfig.json";
import * as DatabaseTypes from "../module-cosmetics/src/types/";
import { Database } from "./src/database";
import { Collection } from "mongodb";
import { router as itemRouter } from "./src/item";
import { router as bundleRouter } from "./src/bundles";
import { router as purchasesRouter } from "./src/purchases";
import express from "express";

const app = express();

app.use(express.json());

declare const database: CosmeticDatabase;

export type CosmeticCollections = {
  items: Collection<DatabaseTypes.Item>;
  bundles: Collection<DatabaseTypes.Bundle>;
  purchases: Collection<DatabaseTypes.Purchase>;
};

export type CosmeticDatabase = Database<CosmeticCollections>;

(async (): Promise<void> => {
  if (process.env.ACCOUNT_AUTH_TOKEN === undefined) {
    throw new Error("Authentication token is required. Set environment variable: ACCOUNT_AUTH_TOKEN");
  }

  (global as any).database = await Database.connect<CosmeticCollections>(DatabaseConfig, { items: undefined as any, bundles: undefined as any, purchases: undefined as any });

  await database.collections.items.createIndex({ id: 1 }, { unique: true });

  app.use("/v1/item", itemRouter);
  app.use("/v1/bundle", bundleRouter);
  app.use("/v1/purchases", purchasesRouter);

  app.listen(2219, () => {
    console.log("Listening on 2219");
  });
})();
