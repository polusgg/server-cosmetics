export type Item = {
  id: string;
  name: string;
  amongUsId: number;
  resource: {
    name: string;
    id: number;
  };
} & (
  {
    type: "HAT";
  } | {
    type: "PET";
  } | {
    type: "SKIN";
  } | {
    type: "MODEL";
  }
);

export const partialItemSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    resource: {
      type: "object",
      properties: {
        path: { type: "string" },
        id: { type: "number" },
      },
      required: ["name", "id"],
    },
    thumbnail: { type: "string" },
    type: { type: "string" },
  },
};

export const itemSchema = {
  ...partialItemSchema,
  required: ["name", "resource", "thumbnail", "type"],
};
