import * as github from "@actions/github";

import { Inputs } from "../input";

type Params = Readonly<{
  token: Inputs["token"];
}>;
export const octokitGraphQLClient = (params: Params) => {
  const octokit = github.getOctokit(params.token);
  const query = <Variables, Response>(
    query: Parameters<typeof octokit.graphql>[0],
    options?: Parameters<typeof octokit.graphql>[1] & Variables
  ) => octokit.graphql<Response>(query, options);

  return { client: { query } };
};
