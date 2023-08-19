import * as core from "@actions/core";
// import * as exec from "@actions/exec";
import * as github from "@actions/github";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const query = `query commitRef($owner: String!, $repo: String!, $expression: String!) {
  repository(name: $repo, owner: $owner) {
    object(expression: $expression) {
      __typename
      ... on Commit {
        statusCheckRollup {
          state
          contexts(first: 100) {
            totalCount
            nodes {
              __typename
              ... on CheckRun {
                completedAt
                conclusion
                permalink
                startedAt
                status
                summary
                text
              }
              ... on StatusContext {
                createdAt
                context
                description
                state
                targetUrl
              }
            }
          }
        }
      }
    }
  }
}
`;

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };
    const context = github.context;
    const octokit = github.getOctokit(inputs.token);

    const vars = { ...context.repo, expression: context.sha };

    const res = await octokit.graphql(query, vars);

    // const hoge = await exec.exec(
    //   `gh pr checks ${context.payload.pull_request?.number}`
    // );

    core.debug(JSON.stringify(inputs, null, 2));
    core.debug(JSON.stringify(res, null, 2));
    // core.debug(`${hoge}`);
    // core.debug(JSON.stringify(context, null, 2));

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
