import { authenticate } from "../middleware/authenticate";
import { Item, itemSchema, partialItemSchema } from "@polusgg/module-cosmetics/src/types/item";
import { Router as createRouter } from "express";
import { CosmeticDatabase } from "../..";
import Ajv from "ajv";

declare const database: CosmeticDatabase;

export const router = createRouter();

const ajv = new Ajv();

router.get("/next", async (req, res) => {
  const emitter = database.collections.items.find().sort({ amongUsId: -1 }).limit(1);
  const items: Item[] = [];

  emitter.on("data", item => {
    items.push(item);
  });

  await new Promise(resolve => emitter.once("end", resolve));

  const amongUsId = items.length > 0 ? items[0].amongUsId + 2 : 10_000_000;

  res.send({
    ok: true,
    data: amongUsId,
  });
});

//check that there are any duplicates!!!
router.post("/next", async (req, res) => {
  const emitter = database.collections.items.find();
  const items: Item[] = [];

  emitter.on("data", item => {
    items.push(item);
  });

  await new Promise(resolve => emitter.once("end", resolve));

  res.send({
    ok: true,
    data: items.filter(i => i.amongUsId === req.body.amongUsId).length > 1,
  });
});

router.get("/", authenticate(async (req, res) => {
  //TODO: implement perk for cosmetics

  const purchases = await database.collections.purchases.find({ purchaser: req.user.client_id, finalized: true });
  const bundles = await database.collections.bundles.find({ id: { $in: await purchases.map(p => p.bundleId).toArray() } });
  const items = await database.collections.items.find({ id: { $in: await (await bundles.toArray()).map(p => p.items).flat() } });

  res.send({ ok: true, data: await items.toArray() });
}));

router.get("/auid/:item", async (req, res) => {
  const amongUsId = parseInt(req.params.item, 10);

  const item = await database.collections.items.findOne({ amongUsId });

  if (item === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: `Failed to find item with AmongUsId: ${amongUsId}`,
    });

    return;
  }

  delete (item as any)._id;

  res.send({
    ok: true,
    data: item,
  });
});

router.get("/:item", async (req, res) => {
  const id = req.params.item;

  const item = await database.collections.items.findOne({ id });

  if (item === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: `Failed to find item with ID: ${id}`,
    });

    return;
  }

  delete (item as any)._id;

  res.send({
    ok: true,
    data: item,
  });
});

router.put("/:item", authenticate(async (req, res): Promise<void> => {
  if (!req.user.perks.includes("cosmetic.item.create")) {
    res.status(403);
    res.send({
      ok: false,
      cause: `Permissions Error: Missing perk "cosmetic.item.create"`,
    });

    return;
  }

  req.body.id = req.params.item;

  const validateItem = ajv.compile(itemSchema);
  const valid = validateItem(req.body);

  if (!valid) {
    res.status(403);
    res.send({
      ok: false,
      cause: validateItem.errors,
    });

    return;
  }

  // const emitter = database.collections.items.find({ type: req.body.type }).sort({ amongUsId: -1 }).limit(1);
  // const items: Item[] = [];
  //
  // emitter.on("data", item => {
  //   items.push(item);
  // });
  //
  // await new Promise(resolve => emitter.once("end", resolve));

  // req.body.amongUsId = items.length > 0 ? items[0].amongUsId + 1 : 10_000_000;

  try {
    await database.collections.items.insertOne(req.body);
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Internal Server Error: failed to add item to database ${err}`,
    });

    return;
  }

  res.send({
    ok: true,
  });
}));

router.patch("/:item", authenticate(async (req, res): Promise<void> => {
  if (!req.user.perks.includes("cosmetic.item.update")) {
    res.status(403);
    res.send({
      ok: false,
      cause: `Permissions Error: Missing perk "cosmetic.item.update"`,
    });

    return;
  }

  req.body.id = req.params.item;

  const validateItem = ajv.compile(partialItemSchema);
  const valid = validateItem(req.body);

  if (!valid) {
    res.status(403);
    res.send({
      ok: false,
      cause: validateItem.errors,
    });

    return;
  }

  try {
    await database.collections.items.updateOne({ id: req.body.id }, { $set: req.body });
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Internal Server Error: failed to add item to database ${err}`,
    });

    return;
  }

  res.send({
    ok: true,
  });
}));
