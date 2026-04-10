import { MongoMemoryReplSet } from "mongodb-memory-server";

export async function startE2eMongo(): Promise<MongoMemoryReplSet> {
  return MongoMemoryReplSet.create({
    replSet: { count: 1, name: "rs0" },
  });
}
