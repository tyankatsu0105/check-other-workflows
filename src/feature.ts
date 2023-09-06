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
    context: {
      job: params.context.job,
      payload: {
        pull_request: {
          number: params.context.payload.pull_request?.number ?? 0,
        },
      },
      repo: {
        owner: params.context.repo.owner,
        repo: params.context.repo.repo,
      },
      runId: params.context.runId,
    },
    delay,
  });

  core.setOutput("status", status);
};
