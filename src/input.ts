import * as core from "@actions/core";

/**
 * Must sync action.yml
 */
export type Inputs = Readonly<{
  /**
   * GitHub Access Token
   */
  token: string;

  /**
   * Interval to check status
   * @default '5000'
   */
  interval: string;
}>;

export const getInput = <InputKey extends keyof Inputs>(
  name: InputKey,
  options?: Parameters<typeof core.getInput>[1]
): Inputs[InputKey] => core.getInput(name, options);
