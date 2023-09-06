import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  config: {
    scalars: {
      URI: "string",
    },
  },
  documents: "src/graphql/query/*.graphql",

  generates: {
    "src/graphql/generated.ts": {
      config: {
        documentMode: "string",
        skipTypename: true,
      },
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
    },
    "src/graphql/mocks/generated.ts": {
      config: {
        scalars: {
          URI: "string",
        },
        skipTypename: true,
      },
      plugins: ["typescript", "typescript-operations", "typescript-msw"],
    },
  },
  schema: "src/graphql/schema.docs.graphql",
};

export default config;
