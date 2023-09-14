import * as core from "@actions/core";
import * as github from "@actions/github";

import { feature } from "./feature";
import { getInput, Inputs } from "./input";

const run = async () => {
  try {
    const inputs: Inputs = {
      interval: getInput("interval") || "5000",
      token: getInput("token", { required: true }),
    };

    const context = github.context;

    await feature({
      context,
      inputs,
    });
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
