import { Match } from "effect";
import type { CommandResult } from "./command";

export const statusFromCommandResult = (
  result: CommandResult,
): string | undefined =>
  Match.value(result).pipe(
    Match.tag("NoResult", () => undefined),
    Match.tag("DeletePrompted", ({ branch }) => `Delete ${branch.name} y/n`),
    Match.tag("DeleteCancelled", () => "Cancelled delete"),
    Match.tag(
      "DeleteRejectedCurrent",
      ({ branch }) => `Cannot delete current branch ${branch.name}`,
    ),
    Match.tag("DeleteSucceeded", ({ branch }) => `Deleted ${branch.name}`),
    Match.tag(
      "DeleteFailed",
      ({ branch }) => `Failed to delete ${branch.name}`,
    ),
    Match.tag("RefreshSucceeded", () => "Refreshed"),
    Match.tag("RefreshFailed", () => "Failed to refresh branches"),
    Match.tag("CommandFailed", () => "CommandFailed"),
    Match.tag("LoadBranchesSucceeded", () => "Select a branch"),
    Match.tag("LoadBranchesFailed", () => "Failed to load branches"),
    Match.tag(
      "SwitchBranchSucceeded",
      ({ branch }) => `Switched to ${branch.name}`,
    ),
    Match.tag(
      "SwitchBranchFailed",
      ({ branch }) => `Failed to switch to ${branch.name}`,
    ),
    Match.exhaustive,
  );
