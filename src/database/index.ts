import { Db, MongoClient, Collection } from "mongodb";
import { Config } from "./types/config";

export class Database<Collections extends Record<string, Collection>> {
  constructor(protected readonly mongo: Db, public readonly collections: Collections) {}

  static async connect<Collections extends Record<string, { [key: string]: any }>>(config: Config, collections: Collections): Promise<Database<{ [key in keyof Collections ]: Collection<Collections[key]> }>> {
    console.log("connecting to mongo");

    // @ts-ignore
    const client = await MongoClient.connect(config.url, { useUnifiedTopology: true, ssl: true, sslCA: config.caCertPath });
    const database = client.db();

    const instantiatedCollections: { [key in keyof Collections]: Collection<Collections[key]>; } = Object.fromEntries(Object.entries(collections).map(([key]) => [key, database.collection(key)])) as any;

    return new Database(database, instantiatedCollections);
  }
}
