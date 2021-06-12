import { partialPurchaseSchema } from "../database/types/purchase";
import { authenticate } from "../middleware/authenticate";
import { Router as createRouter } from "express";
import formUrlEncoded from "form-urlencoded";
import { CosmeticDatabase } from "../..";
import Ajv from "ajv";
import got from "got";

declare const database: CosmeticDatabase;

export const router = createRouter();

const ajv = new Ajv();

router.get("/:purchase", async (req, res) => {
  const id = req.params.purchase.split("-").join("");

  const purchase = await database.collections.purchases.findOne({ id });

  if (purchase === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: `Failed to find purchase with ID: ${id}`,
    });

    return;
  }

  delete (purchase as any)._id;

  res.send({
    ok: true,
    data: purchase,
  });
});

router.patch("/:purchase", authenticate(async (req, res): Promise<void> => {
  // if (!req.user.perks.includes("cosmetic.purchase.update")) {
  //   res.status(403);
  //   res.send({
  //     ok: false,
  //     cause: `Permissions Error: Missing perk "cosmetic.purchase.update"`,
  //   });

  //   return;
  // }

  req.body.id = req.params.purchase.split("-").join("");

  const validatePurchase = ajv.compile(partialPurchaseSchema);
  const valid = validatePurchase(req.body);

  if (!valid) {
    res.status(403);
    res.send({
      ok: false,
      cause: validatePurchase.errors,
    });

    return;
  }

  try {
    await database.collections.purchases.updateOne({ id: req.body.id }, { $set: req.body });
  } catch (err) {
    res.status(500);
    res.send({
      ok: false,
      cause: `Internal Server Error: failed to add purchase to database ${err}`,
    });

    return;
  }

  res.send({
    ok: true,
  });
}));

router.post("/:purchase/finalise", authenticate(async (req, res): Promise<void> => {
  const purchase = await database.collections.purchases.findOne({ id: req.params.purchase.split("-").join("") });

  if (purchase === null) {
    res.status(404);
    res.send({
      ok: false,
      cause: "Purchase does not exist",
    });

    return;
  }

  if (purchase.purchaser !== req.user.client_id) {
    res.status(403);
    res.send({
      ok: false,
      cause: "You were not the purchaser",
    });

    return;
  }

  switch (purchase.vendorData.name) {
    case "STEAM": {
      let response;

      try {
        response = await got("https://partner.steam-api.com/ISteamMicroTxn/FinalizeTxn/v2/", {
          body: formUrlEncoded({
            key: process.env.STEAM_PUBLISHER_KEY,
            orderid: purchase.vendorData.orderId,
            appid: 1653240,
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

      let parsedResponse;

      try {
        parsedResponse = JSON.parse(response.body);
      } catch (err) {
        res.status(500);
        res.send({
          ok: false,
          cause: `Critical SteamApi Error: ${response.body}`,
        });

        return;
      }

      if (parsedResponse.result === "Failure") {
        res.status(500);
        res.send({
          ok: false,
          cause: `SteamApi Error: ${parsedResponse.error?.errordesc}`,
          detail: parsedResponse.error,
        });

        return;
      }

      res.status(200);
      res.send({
        ok: true,
      });
      break;
    }
    case "PLAY_STORE":
      break;
  }
}));
