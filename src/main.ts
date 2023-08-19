import * as core from "@actions/core";
// import * as exec from "@actions/exec";
import * as github from "@actions/github";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const query = `query a {
  repository(owner: "tyankatsu0105", name: "check-other-workflows"){
    pullRequest(number: 2){
      commits(last: 1){
        edges{
          node{
            commit {
              statusCheckRollup{
                state
                contexts(first: 100){
                  totalCount
                  nodes{
                    __typename
                    ... on CheckRun{
                      name
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
