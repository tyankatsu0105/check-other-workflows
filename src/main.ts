import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";

import { feature } from "./feature";
import {
  CheckStatusState,
  GetLatestCommitChecksDocument,
  GetLatestCommitChecksQuery,
  GetLatestCommitChecksQueryVariables,
  octokitGraphQLClient,
  StatusState,
} from "./graphql";
import { getInput, Inputs } from "./input";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatusState = async (
  params: Readonly<{
    repository: GetLatestCommitChecksQuery["repository"];
    client: ReturnType<typeof octokitGraphQLClient>["client"];
    context: Context;
    delay: number;
    ignoreWorkflows: string[];
  }>
): Promise<StatusState> => {
  const isAllCompleted =
    params.repository?.pullRequest?.commits.edges?.[0]?.node?.commit.statusCheckRollup?.contexts.nodes?.every(
      (node) => {
        if (node?.__typename !== "CheckRun") return true;
        if (params.ignoreWorkflows.includes(node.name)) return true;
        if (node.conclusion === null) return false;

        return node.status === CheckStatusState.Completed;
      }
    );

  if (isAllCompleted)
    return (
      params.repository?.pullRequest?.commits.edges?.[0]?.node?.commit
        .statusCheckRollup?.state ?? StatusState.Success
    );

  const data = await params.client.query<
    GetLatestCommitChecksQueryVariables,
    GetLatestCommitChecksQuery
  >(GetLatestCommitChecksDocument.toString(), {
    owner: params.context.repo.owner,
    pr: params.context.payload.pull_request?.number ?? 0,
    repo: params.context.repo.repo,
  });

  await wait(params.delay);
  core.info("Waiting for all checks to complete...");

  return getStatusState({
    client: params.client,
    context: params.context,
    delay: params.delay,
    ignoreWorkflows: params.ignoreWorkflows,
    repository: data.repository,
  });
};

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };

    const context = github.context;
    const self = context.workflow;
    const ignoreWorkflows = [self];

    const { client } = octokitGraphQLClient({ token: inputs.token });

    const { repository } = await client.query<
      GetLatestCommitChecksQueryVariables,
      GetLatestCommitChecksQuery
    >(GetLatestCommitChecksDocument.toString(), {
      owner: context.repo.owner,
      pr: context.payload.pull_request?.number ?? 0,
      repo: context.repo.repo,
    });

    const state = await getStatusState({
      client,
      context,
      delay: 5000,
      ignoreWorkflows,
      repository,
    });

    core.debug(JSON.stringify(inputs, null, 2));
    core.debug(JSON.stringify(state, null, 2));

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
