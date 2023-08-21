import * as core from "@actions/core";
import * as github from "@actions/github";

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

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };

    const context = github.context;

    const { client } = octokitGraphQLClient({ token: inputs.token });

    const getStatusState = async () => {
      let isAllCompleted: boolean | undefined = false;
      let state: StatusState | null = null;

      while (!isAllCompleted) {
        const data = await client.query<
          GetLatestCommitChecksQueryVariables,
          GetLatestCommitChecksQuery
        >(GetLatestCommitChecksDocument.toString(), {
          owner: context.repo.owner,
          pr: context.payload.pull_request?.number ?? 0,
          repo: context.repo.repo,
        });

        const repository = data.repository;

        isAllCompleted =
          repository?.pullRequest?.commits.edges?.[0]?.node?.commit.statusCheckRollup?.contexts.nodes?.every(
            (node) => {
              if (node?.__typename !== "CheckRun") return true;
              if (node.conclusion === null) return false;

              return node.status === CheckStatusState.Completed;
            }
          );

        if (isAllCompleted) {
          state =
            repository?.pullRequest?.commits.edges?.[0]?.node?.commit
              .statusCheckRollup?.state ?? StatusState.Success;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        core.info("Waiting for all checks to complete...");
      }

      return state!;
    };

    const state = await getStatusState();

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
