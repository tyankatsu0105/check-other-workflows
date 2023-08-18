import * as core from "@actions/core";

type Input = Readonly<{
  /**
   * The number of milliseconds to wait.
   * @example 1000
   */
  milliseconds: string;
}>;

export const getInput = <InputKey extends keyof Input>(
  name: InputKey,
  options?: Parameters<typeof core.getInput>[1],
): Input[InputKey] => core.getInput(name, options);
