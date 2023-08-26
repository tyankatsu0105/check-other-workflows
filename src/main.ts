import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";

import { feature } from "./feature";
import {
  CheckConclusionState,
  CheckStatusState,
  GetLatestCommitChecksDocument,
  GetLatestCommitChecksQuery,
  GetLatestCommitChecksQueryVariables,
  octokitGraphQLClient,
  StatusState,
} from "./graphql";
import { getInput, Inputs } from "./input";

const assertData = <ReturnType = unknown>(
  data: never,
  callback?: (data: never) => ReturnType
) => (callback ? callback(data) : data);

const statusOnStatusCheckRollupContext = (
  context: NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<
            NonNullable<
              NonNullable<
                NonNullable<
                  GetLatestCommitChecksQuery["repository"]
                >["pullRequest"]
              >["commits"]["edges"]
            >[number]
          >["node"]
        >["commit"]["statusCheckRollup"]
      >["contexts"]
    >["nodes"]
  >[number]
) => {
  if (context?.__typename !== "CheckRun")
    throw new Error("context is not CheckRun");
  // conclusion get some value when status is "COMPLETED"
  if (context.status !== CheckStatusState.Completed)
    return "NOT_COMPLETED" as const;
  // conclusion is null when status is "QUEUED" or "IN_PROGRESS"
  if (!context.conclusion) return "NOT_COMPLETED" as const;

  switch (context.conclusion) {
    case CheckConclusionState.Success:
      return "SUCCESS" as const;

    case CheckConclusionState.Neutral:
    case CheckConclusionState.Skipped:
      return "IGNORE" as const;

    case CheckConclusionState.ActionRequired:
    case CheckConclusionState.Cancelled:
    case CheckConclusionState.Failure:
    case CheckConclusionState.Stale:
    case CheckConclusionState.StartupFailure:
    case CheckConclusionState.TimedOut:
      return "FAILURE" as const;

    default:
      return assertData(context.conclusion, () => "FAILURE" as const);
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatusState = async (
  params: Readonly<{
    client: ReturnType<typeof octokitGraphQLClient>["client"];
    context: Context;
    delay: number;
  }>
): Promise<StatusState> => {
  const { repository } = await params.client.query<
    GetLatestCommitChecksQueryVariables,
    GetLatestCommitChecksQuery
  >(GetLatestCommitChecksDocument.toString(), {
    owner: params.context.repo.owner,
    pr: params.context.payload.pull_request?.number ?? 0,
    repo: params.context.repo.repo,
  });

  const contextsWithoutSelf =
    repository?.pullRequest?.commits.edges?.[0]?.node?.commit.statusCheckRollup?.contexts.nodes?.filter(
      (node) => {
        const selfID = params.context.runId;

        if (
          node?.__typename === "CheckRun" &&
          node.permalink.includes(selfID.toString()) &&
          params.context.job === node.name
        )
          return false;

        return true;
      }
    );

  const needRefetch = contextsWithoutSelf?.some((context) => {
    const status = statusOnStatusCheckRollupContext(context);

    return status === "NOT_COMPLETED";
  });

  if (!needRefetch)
    return (
      repository?.pullRequest?.commits.edges?.[0]?.node?.commit
        .statusCheckRollup?.state ?? StatusState.Success
    );

  // contextsWithoutSelf?.forEach((context) => {
  //   const status = statusOnStatusCheckRollupContext(context);

  //   switch (status) {
  //     case 'IGNORE':

  //       break;

  //     default:
  //       assertData(status, () => {});
  //   }
  // });

  // const isAllCompleted =
  //   repository?.pullRequest?.commits.edges?.[0]?.node?.commit.statusCheckRollup?.contexts.nodes?.every(
  //     (node) => {
  //       if (node?.__typename !== "CheckRun") return;
  //       if (node.conclusion === null) return;

  //       if (node.permalink.includes(params.selfID.toString())) return true;

  //       return node.status === CheckStatusState.Completed;
  //     }
  //   );

  // if (isAllCompleted)
  //   return (
  //     repository?.pullRequest?.commits.edges?.[0]?.node?.commit
  //       .statusCheckRollup?.state ?? StatusState.Success
  //   );

  await wait(params.delay);
  core.info("Waiting for all checks to complete...");

  return await getStatusState({
    client: params.client,
    context: params.context,
    delay: params.delay,
  });
};

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };

    const context = github.context;

    const { client } = octokitGraphQLClient({ token: inputs.token });

    const state = await getStatusState({
      client,
      context,
      delay: 5000,
    });

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
