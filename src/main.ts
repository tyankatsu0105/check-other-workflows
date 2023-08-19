import * as core from "@actions/core";
import * as github from "@actions/github";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const run = () => {
  try {
    const inputs: Inputs = {
      token: getInput("token"),
    };
    const context = github.context;

    core.debug(JSON.stringify(inputs, null, 2));
    core.debug(JSON.stringify(context, null, 2));

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
