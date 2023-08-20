import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  documents: "src/graphql/query/*.graphql",

  generates: {
    "src/graphql/generated.ts": {
      config: {
        documentMode: "string",
        skipTypename: true,
      },
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
    },
  },
  // overwrite: true,
  schema: "src/graphql/schema.docs.graphql",
};

export default config;
