import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";

import {
  CheckConclusionState,
  CheckStatusState,
  GetLatestCommitChecksDocument,
  GetLatestCommitChecksQuery,
  GetLatestCommitChecksQueryVariables,
  octokitGraphQLClient,
} from "./graphql";
import { assertData, wait } from "./shared";

const customContextStatus = {
  FAILURE: "FAILURE",
  IGNORE: "IGNORE",
  NOT_COMPLETED: "NOT_COMPLETED",
  SUCCESS: "SUCCESS",
} as const;

type CustomContextStatusValues =
  (typeof customContextStatus)[keyof typeof customContextStatus];

type Commit = Extract<
  NonNullable<GetLatestCommitChecksQuery["repository"]>["object"],
  { __typename: "Commit" }
>;
type StatusCheckRollupContext = NonNullable<
  NonNullable<Commit["statusCheckRollup"]>["contexts"]["nodes"]
>[number];

const statusOnStatusCheckRollupContext = (
  context: StatusCheckRollupContext
): CustomContextStatusValues => {
  if (context?.__typename !== "CheckRun")
    throw new Error("context is not CheckRun");
  // conclusion get some value when status is "COMPLETED"
  if (context.status !== CheckStatusState.Completed)
    return customContextStatus.NOT_COMPLETED;
  // conclusion is null when status is "QUEUED" or "IN_PROGRESS"
  if (!context.conclusion) return customContextStatus.NOT_COMPLETED;

  switch (context.conclusion) {
    case CheckConclusionState.Success:
      return customContextStatus.SUCCESS;

    case CheckConclusionState.Neutral:
    case CheckConclusionState.Skipped:
      return customContextStatus.IGNORE;

    case CheckConclusionState.ActionRequired:
    case CheckConclusionState.Cancelled:
    case CheckConclusionState.Failure:
    case CheckConclusionState.Stale:
    case CheckConclusionState.StartupFailure:
    case CheckConclusionState.TimedOut:
      return customContextStatus.FAILURE;

    default:
      return assertData(context.conclusion, () => customContextStatus.FAILURE);
  }
};

/**
 * NOTE: `statusCheckRollup.state` is only judged for the first time.
 * It does not become PENDING, in events such as approved and labeled.
 * So, we choose to use the conclusion and status of the context because it changes in real time.
 */
export const getStatusState = async (
  params: Readonly<{
    client: ReturnType<typeof octokitGraphQLClient>["client"];
    context: {
      repo: {
        owner: Context["repo"]["owner"];
        repo: Context["repo"]["repo"];
      };
      job: Context["job"];
      sha: Context["sha"];
      runId: Context["runId"];
    };
    delay: number;
  }>
): Promise<CustomContextStatusValues> => {
  const { repository } = await params.client.query<
    GetLatestCommitChecksQueryVariables,
    GetLatestCommitChecksQuery
  >(GetLatestCommitChecksDocument.toString(), {
    expression: params.context.sha,
    owner: params.context.repo.owner,
    repo: params.context.repo.repo,
  });
  core.setOutput("repository", JSON.stringify(repository));
  core.setOutput("expression", JSON.stringify(params.context.sha));
  if (repository?.object?.__typename !== "Commit")
    return customContextStatus.FAILURE;

  const contextsWithoutSelf =
    repository.object.statusCheckRollup?.contexts.nodes?.filter((node) => {
      const selfID = params.context.runId;

      if (
        node?.__typename === "CheckRun" &&
        node.permalink.includes(selfID.toString()) &&
        params.context.job === node.name
      )
        return false;

      return true;
    });

  const needRefetch = contextsWithoutSelf?.some((context) => {
    const status = statusOnStatusCheckRollupContext(context);

    return status === "NOT_COMPLETED";
  });

  if (needRefetch) {
    await wait(params.delay);
    core.info("Waiting for all checks to complete...");

    return await getStatusState({
      client: params.client,
      context: params.context,
      delay: params.delay,
    });
  }

  const isAllSuccess = contextsWithoutSelf?.every((context) => {
    const status = statusOnStatusCheckRollupContext(context);

    return status === customContextStatus.SUCCESS;
  });

  if (isAllSuccess) return customContextStatus.SUCCESS;
  return customContextStatus.FAILURE;
};
