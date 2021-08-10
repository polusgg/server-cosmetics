export type Item = {
  id: string;
  name: string;
  amongUsId: number;
  thumbnail: string;
  resource: {
    path: string;
    url: string;
    id: number;
  };
  author: string;
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
        url: { type: "string" },
        id: { type: "number" },
      },
      required: ["path", "url", "id"],
    },
    thumbnail: { type: "string" },
    type: { type: "string" },
    author: { type: "string" },
  },
};

export const itemSchema = {
  ...partialItemSchema,
  required: ["name", "resource", "thumbnail", "type", "author"],
};
