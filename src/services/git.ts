import { Data, Effect } from "effect";
import { Command, CommandExecutor } from "@effect/platform";
import { parseBranches, type Branch } from "../domain/branch";
import { BunContext } from "@effect/platform-bun";

export class GitError extends Data.TaggedError("GitError")<{
  readonly args: readonly string[];
  readonly cause: unknown;
}> {}

export class GitService extends Effect.Service<GitService>()("GitService", {
  accessors: true,
  dependencies: [BunContext.layer],
  effect: Effect.gen(function* () {
    const executor = yield* CommandExecutor.CommandExecutor;

    const runGit = (args: readonly string[]) =>
      executor.string(Command.make("git", ...args)).pipe(
        Effect.mapError(
          (cause) =>
            new GitError({
              args,
              cause,
            }),
        ),
      );

    return {
      listBranches: () =>
        runGit(["branch", "--format=%(HEAD) %(refname:short)"]).pipe(
          Effect.map(parseBranches),
        ),
      switchBranch: (branch: Branch) =>
        runGit(["switch", branch.name]).pipe(Effect.asVoid),

      deleteBranch: (branch: Branch) =>
        runGit(["branch", "-D", branch.name]).pipe(Effect.asVoid),
    };
  }),
}) {}
