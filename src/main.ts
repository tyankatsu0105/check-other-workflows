import * as core from "@actions/core";
import * as github from "@actions/github";

import { feature } from "./feature";
import {
  // CheckStatusState,
  GetLatestCommitChecksDocument,
  GetLatestCommitChecksQuery,
  GetLatestCommitChecksQueryVariables,
  octokitGraphQLClient,
} from "./graphql";
import { getInput, Inputs } from "./input";

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };

    const context = github.context;

    const { client } = octokitGraphQLClient({ token: inputs.token });

    // const is = () =>
    const { repository } = await client.query<
      GetLatestCommitChecksQueryVariables,
      GetLatestCommitChecksQuery
    >(GetLatestCommitChecksDocument.toString(), {
      owner: context.repo.owner,
      pr: context.payload.pull_request?.number ?? 0,
      repo: context.repo.repo,
    });

    // const
    // repository?.pullRequest?.commits.edges?.map((edge) => {
    //   edge?.node?.commit.statusCheckRollup?.contexts.nodes?.map(node => {
    //     if(node?.__typename !== 'CheckRun') return
    //     node.conclusion
    //   })
    // });
    core.debug(JSON.stringify(inputs, null, 2));
    core.debug(JSON.stringify(repository, null, 2));

    // core.setOutput("time", new Date().toTimeString());
    feature({
      context,
      inputs,
    });
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

run();
