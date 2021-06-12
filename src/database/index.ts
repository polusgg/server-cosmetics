import { Db, MongoClient, Collection } from "mongodb";

export class Database<Collections extends Record<string, Collection>> {
  constructor(protected readonly mongo: Db, public readonly collections: Collections) {}

  static async connect<Collections extends Record<string, { [key: string]: any }>>(url: string, databaseName: string, collections: Collections): Promise<Database<{ [key in keyof Collections ]: Collection<Collections[key]> }>> {
    const client = await MongoClient.connect(url, { useUnifiedTopology: true });
    const database = client.db(databaseName);

    const instantiatedCollections: { [key in keyof Collections]: Collection<Collections[key]>; } = Object.keys(collections).map(key => database.collection(key)) as any;

    return new Database(database, instantiatedCollections);
  }
}
