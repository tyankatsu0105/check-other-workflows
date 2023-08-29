import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";

import { octokitGraphQLClient } from "./graphql";
import { Inputs } from "./input";
import { getStatusState } from "./status";

type Params = Readonly<{
  inputs: Inputs;
  context: Context;
}>;
export const feature = async (params: Params) => {
  const { client } = octokitGraphQLClient({ token: params.inputs.token });
  const delay = Number(params.inputs.interval);

  const status = await getStatusState({
    client,
    context: params.context,
    delay,
  });

  core.setOutput("status", status);
};
