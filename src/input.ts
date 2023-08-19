import * as core from "@actions/core";

export type Inputs = Readonly<{
  /**
   * GitHub Access Token
   */
  token: string;
}>;

export const getInput = <InputKey extends keyof Inputs>(
  name: InputKey,
  options?: Parameters<typeof core.getInput>[1]
): Inputs[InputKey] => core.getInput(name, options);
