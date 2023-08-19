import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const run = async () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };
    const context = github.context;
    const octokit = github.getOctokit(inputs.token);

    const { data } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      pull_number: context.payload.pull_request?.number ?? 0,
      repo: context.repo.repo,
    });

    const hoge = await exec.exec(
      `gh pr checks ${context.payload.pull_request?.number}`
    );

    core.debug(JSON.stringify(inputs, null, 2));
    core.debug(data.statuses_url);
    core.debug(`${hoge}`);
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
