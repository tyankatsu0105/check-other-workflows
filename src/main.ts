import * as core from "@actions/core";
// import * as exec from "@actions/exec";
import * as github from "@actions/github";
import type { GraphQlQueryResponseData } from "@octokit/graphql";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const query = `query a($owner: String!, $repo: String!, $pr: Int!) {
  repository(name: $repo, owner: $owner){
    pullRequest(number: $pr){
      commits(last: 1){
        edges{
          node{
            commit {
              statusCheckRollup{
                state
                contexts(first: 50){
                  totalCount
                  nodes{
                    __typename
                    ... on CheckRun{
                      name
                      checkSuite {
                        id
                        status
                      }
                    }
                  }
                }
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

    const parameters = {
      owner: context.repo.owner,
      pr: context.payload.pull_request?.number,
      repo: context.repo.repo,
    };

    const res = await octokit.graphql(query, parameters);

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
