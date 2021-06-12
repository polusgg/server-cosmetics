export type Purchase = {
  id: string;
  cost: number;
  purchaser: string;
  timeCreated: number;
  timeFinalized: number;
  finalized: boolean;
  vendorData: {
    name: "STEAM";
    orderId: string;
    userId: number;
  } | {
    name: "PLAY_STORE";
    transactionId: string;
  };
};

export const partialPurchaseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    cost: { type: "number" },
    purchaser: { type: "string" },
    timeCreated: { type: "number" },
    timeFinalized: { type: "number" },
    finalized: { type: "boolean" },
    vendorData: {
      type: "object",
      oneOf: [
        {
          properties: {
            name: { type: "string", "const": "STEAM" },
            orderId: { type: "string" },
            userId: { type: "number" },
          },
          required: ["name", "orderId", "userId"],
        },
        {
          properties: {
            name: { type: "string", "const": "PLAY_STORE" },
            transactionId: { type: "string" },
          },
          required: ["name"],
        },
      ],
    },
  },
};

export const purchaseSchema = {
  ...partialPurchaseSchema,
  required: ["id", "cost", "purchaser", "time", "vendorData"],
};
