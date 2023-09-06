import * as core from "@actions/core";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CheckConclusionState,
  CheckStatusState,
  octokitGraphQLClient,
} from "./graphql";
import {
  mockGetLatestCommitChecksQuery,
  StatusState,
} from "./graphql/mocks/generated";
import * as Feature from "./status";

const infoMock = vi.spyOn(core, "info");

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockedClient = () => {
  const { client } = octokitGraphQLClient({ token: "test" });

  return { client };
};

const getPermalink = (params: {
  readonly runId: number;
  readonly repo: string;
  readonly owner: string;
}) => {
  const jobId = () => {
    const min = 100000000000;
    const max = 999999999999;

    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    return randomNumber;
  };

  return `https://github.com/${params.owner}/${params.repo}/actions/runs/${
    params.runId
  }/job/${jobId()}`;
};

describe("status", () => {
  describe("getStatusState", () => {
    describe("success", () => {
      it("when all statusCheckRollup's contexts's conclusion is success, then return SUCCESS.", async () => {
        const { client } = mockedClient();
        const params: Parameters<typeof Feature.getStatusState>[0] = {
          client,
          context: {
            job: "job",
            payload: {
              pull_request: {
                number: 0,
              },
            },
            repo: {
              owner: "owner",
              repo: "repo",
            },
            runId: 123456789,
          },
          delay: 1000,
        };
        server.use(
          mockGetLatestCommitChecksQuery((_, res, ctx) => {
            return res(
              ctx.data({
                repository: {
                  pullRequest: {
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              statusCheckRollup: {
                                contexts: {
                                  nodes: [
                                    {
                                      __typename: "CheckRun",
                                      conclusion: CheckConclusionState.Success,
                                      name: "test",
                                      permalink: getPermalink({
                                        owner: params.context.repo.owner,
                                        repo: params.context.repo.repo,
                                        runId: params.context.runId,
                                      }),
                                      status: CheckStatusState.Completed,
                                    },
                                  ],
                                },
                                state: StatusState.Success,
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              })
            );
          })
        );

        const result = await Feature.getStatusState(params);

        expect(result).toBe("SUCCESS");
      });

      it("when all statusCheckRollup's contexts's status is not completed, then refetch until completed.", async () => {
        const { client } = mockedClient();
        const params: Parameters<typeof Feature.getStatusState>[0] = {
          client,
          context: {
            job: "job",
            payload: {
              pull_request: {
                number: 0,
              },
            },
            repo: {
              owner: "owner",
              repo: "repo",
            },
            runId: 123456789,
          },
          delay: 1000,
        };
        server.use(
          mockGetLatestCommitChecksQuery((_, res, ctx) => {
            return res(
              ctx.data({
                repository: {
                  pullRequest: {
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              statusCheckRollup: {
                                contexts: {
                                  nodes: [
                                    {
                                      __typename: "CheckRun",
                                      conclusion: null,
                                      name: "test",
                                      permalink: getPermalink({
                                        owner: params.context.repo.owner,
                                        repo: params.context.repo.repo,
                                        runId: params.context.runId,
                                      }),
                                      status: CheckStatusState.InProgress,
                                    },
                                  ],
                                },
                                state: StatusState.Success,
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              })
            );
          })
        );

        setTimeout(() => {
          server.use(
            mockGetLatestCommitChecksQuery((_, res, ctx) => {
              return res(
                ctx.data({
                  repository: {
                    pullRequest: {
                      commits: {
                        edges: [
                          {
                            node: {
                              commit: {
                                statusCheckRollup: {
                                  contexts: {
                                    nodes: [
                                      {
                                        __typename: "CheckRun",
                                        conclusion:
                                          CheckConclusionState.Success,
                                        name: "test",
                                        permalink: getPermalink({
                                          owner: params.context.repo.owner,
                                          repo: params.context.repo.repo,
                                          runId: params.context.runId,
                                        }),
                                        status: CheckStatusState.Completed,
                                      },
                                    ],
                                  },
                                  state: StatusState.Success,
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                })
              );
            })
          );
        }, 1500);

        const result = await Feature.getStatusState(params);

        expect(infoMock).toHaveBeenCalledWith(
          "Waiting for all checks to complete..."
        );
        expect(result).toBe("SUCCESS");
      });
    });
  });
});
