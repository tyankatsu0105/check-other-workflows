import { Context } from "@actions/github/lib/context";

import { Inputs } from "./input";

type Params = Readonly<{
  inputs: Inputs;
  context: Context;
}>;
export const feature = (params: Params) => {
  console.log({ params });
};
