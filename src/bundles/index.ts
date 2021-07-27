import { Bundle, bundleSchema, partialBundleSchema } from "../database/types/bundle";
import { authenticate } from "../middleware/authenticate";
import { Router as createRouter } from "express";
import formUrlEncoded from "form-urlencoded";
import { CosmeticDatabase } from "../..";
import got, { Response } from "got";
import * as crypto from "crypto";
import { uuid } from "uuidv4";
import Ajv from "ajv";
import { Item } from "../database/types";

declare const database: CosmeticDatabase;

export const router = createRouter();

const ajv = new Ajv();

if (process.env.STEAM_PUBLISHER_KEY === undefined) {
  throw new Error("Process environment variable missing: STEAM_PUBLISHER_KEY");
}

router.get("/", async (req, res) => {
  const emitter = await database.collections.bundles.find({});
  const bundles: Bundle[] = [];

  emitter.on("data", bundle => {
    bundles.push(bundle);
  });

  const emitter2 = database.collections.items.find({ type: req.body.type }).sort({ amongUsId: -1 }).limit(1);
  const items: Map<string, Item> = new Map();

  emitter2.on("data", (item: Item) => {
    items.set(item.id, item);
  });

  await Promise.all([
    new Promise(resolve => emitter.once("end", resolve)),
    new Promise(resolve => emitter2.once("end", resolve)),
  ]);

  const c: any[] = [...bundles];

  for (let i = 0; i < bundles.length; i++) {
    c[i].items = bundles[i].items.map(item => items.get(item));
  }

  res.send(c);
});

router.get("/:bundle", async (req, res) => {
  const id = req.params.bundle.split("-").join("");

  const bundle = await database.collections.bundles.findOne({ id });

  if (bundle === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: `Failed to find bundle with ID: ${id}`,
    });

    return;
  }

  delete (bundle as any)._id;

  res.send({
    ok: true,
    data: bundle,
  });
});

router.put("/:bundle", authenticate(async (req, res): Promise<void> => {
  if (!req.user.perks.includes("cosmetic.bundle.create")) {
    res.status(403);
    res.send({
      ok: false,
      cause: `Permissions Error: Missing perk "cosmetic.bundle.create"`,
    });

    return;
  }

  req.body.id = req.params.bundle.split("-").join("");

  const validateBundle = ajv.compile(bundleSchema);
  const valid = validateBundle(req.body);

  if (!valid) {
    res.status(403);
    res.send({
      ok: false,
      cause: validateBundle.errors,
    });

    return;
  }

  try {
    await database.collections.bundles.insertOne(req.body);
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Internal Server Error: failed to add bundle to database ${err}`,
    });

    return;
  }

  res.send({
    ok: true,
  });
}));

router.patch("/:bundle", authenticate(async (req, res): Promise<void> => {
  if (!req.user.perks.includes("cosmetic.bundle.update")) {
    res.status(403);
    res.send({
      ok: false,
      cause: `Permissions Error: Missing perk "cosmetic.bundle.update"`,
    });

    return;
  }

  req.body.id = req.params.bundle.split("-").join("");

  const validateBundle = ajv.compile(partialBundleSchema);
  const valid = validateBundle(req.body);

  if (!valid) {
    res.status(403);
    res.send({
      ok: false,
      cause: validateBundle.errors,
    });

    return;
  }

  try {
    await database.collections.bundles.updateOne({ id: req.body.id }, { $set: req.body });
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Internal Server Error: failed to add bundle to database ${err}`,
    });

    return;
  }

  res.send({
    ok: true,
  });
}));

router.post("/:bundle/purchase/steam", authenticate(async (req, res): Promise<void> => {
  req.body.id = req.params.bundle.split("-").join("");

  if (req.body.userId === undefined) {
    res.status(403);
    res.send({
      ok: false,
      cause: "Error: Missing userId",
    });

    return;
  }

  const bundle = await database.collections.bundles.findOne({ id: req.body.id });

  if (bundle === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: "Bundle does not exist",
    });

    return;
  }

  const orderId = BigInt(`0x${crypto.randomBytes(8).toString("hex")}`).toString();

  let steamResponse: Response<string>;

  try {
    steamResponse = await got.post("https://partner.steam-api.com/ISteamMicroTxnSandbox/InitTxn/v3/", {
      body: formUrlEncoded({
        key: process.env.STEAM_PUBLISHER_KEY,
        orderid: orderId,
        steamid: req.body.userId,
        appid: 1653240,
        itemcount: 1,
        language: "en",
        currency: "USD",
        itemid: [bundle.id],
        qty: [1],
        amount: [bundle.priceUsd],
        description: [bundle.description],
      }),
    });
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `SteamApi Error: ${err.response.body}`,
    });

    return;
  }

  let steamParsedResponse;

  try {
    steamParsedResponse = JSON.parse(steamResponse.body);
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Critical SteamApi Error: ${steamResponse.body}`,
    });

    return;
  }

  if (steamParsedResponse.result === "Failure") {
    res.status(500);
    res.send({
      ok: false,
      cause: `SteamApi Error: ${steamParsedResponse.error?.errordesc}`,
      detail: steamParsedResponse.error,
    });

    return;
  }

  const purchaseId = uuid();

  await database.collections.purchases.insertOne({
    id: purchaseId,
    cost: bundle.priceUsd,
    purchaser: req.user.client_id,
    timeCreated: Date.now(),
    timeFinalized: -1,
    finalized: false,
    vendorData: {
      name: "STEAM",
      orderId: orderId,
      userId: req.body.userId,
    },
  });

  res.send({
    ok: true,
    purchaseId,
  });
}));
