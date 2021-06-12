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

export const itemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    amongUsId: { type: "number" },
    resource: {
      type: "object",
      properties: {
        name: "string",
        id: "number",
      },
    },
  },
  oneOf: [
    {
      properties: {
        type: { "const": "HAT" },
      },
    },
    {
      properties: {
        type: { "const": "PET" },
      },
    },
    {
      properties: {
        type: { "const": "SKIN" },
      },
    },
    {
      properties: {
        type: { "const": "MODEL" },
      },
    },
  ],
};
