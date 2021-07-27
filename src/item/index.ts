import { authenticate } from "../middleware/authenticate";
import { Item, itemSchema, partialItemSchema } from "../database/types/item";
import { Router as createRouter } from "express";
import { CosmeticDatabase } from "../..";
import Ajv from "ajv";

declare const database: CosmeticDatabase;

export const router = createRouter();

const ajv = new Ajv();

router.get("/:item", async (req, res) => {
  const id = req.params.item.split("-").join("");

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

  req.body.id = req.params.item.split("-").join("");

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

  const emitter = database.collections.items.find({ type: req.body.type }).sort({ amongUsId: -1 }).limit(1);
  const items: Item[] = [];

  emitter.on("data", item => {
    items.push(item);
  });

  await new Promise(resolve => emitter.once("end", resolve));

  req.body.amongUsId = items.length > 0 ? items[0].amongUsId + 1 : 10_000_000;

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

  req.body.id = req.params.item.split("-").join("");

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
