import { authenticate } from "../middleware/authenticate";
import { itemSchema } from "../database/types/item";
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

  req.body.id = req.params.id;

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
