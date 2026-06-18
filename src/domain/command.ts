import { Match } from "effect";
import type { Branch } from "./branch";
import type { Mode } from "./mode";

export type Command =
  | { readonly _tag: "Quit" }
  | { readonly _tag: "RefreshBranches" }
  | { readonly _tag: "PromptDelete"; readonly branch: Branch }
  | { readonly _tag: "DeleteBranch"; readonly branch: Branch }
  | { readonly _tag: "CancelDelete" }
  | { readonly _tag: "RejectDeleteCurrent"; readonly branch: Branch }
  | { readonly _tag: "Noop" };

export type CommandResult =
  | { readonly _tag: "NoResult" }
  | { readonly _tag: "DeletePrompted"; readonly branch: Branch }
  | { readonly _tag: "DeleteCancelled" }
  | { readonly _tag: "DeleteRejectedCurrent"; readonly branch: Branch }
  | { readonly _tag: "DeleteSucceeded"; readonly branch: Branch }
  | { readonly _tag: "DeleteFailed"; readonly branch: Branch }
  | { readonly _tag: "RefreshSucceeded" }
  | { readonly _tag: "RefreshFailed" }
  | { readonly _tag: "CommandFailed" }
  | { readonly _tag: "LoadBranchesSucceeded" }
  | { readonly _tag: "LoadBranchesFailed" }
  | { readonly _tag: "SwitchBranchSucceeded"; readonly branch: Branch }
  | { readonly _tag: "SwitchBranchFailed"; readonly branch: Branch };

export const Commands = {
  quit: (): Command => ({ _tag: "Quit" }),
  refreshBranches: (): Command => ({ _tag: "RefreshBranches" }),
  promptDelete: (branch: Branch): Command => ({ _tag: "PromptDelete", branch }),
  deleteBranch: (branch: Branch): Command => ({ _tag: "DeleteBranch", branch }),
  cancelDelete: (): Command => ({ _tag: "CancelDelete" }),
  rejectDeleteCurrent: (branch: Branch): Command => ({
    _tag: "RejectDeleteCurrent",
    branch,
  }),
  noop: (): Command => ({ _tag: "Noop" }),
};

export const CommandResults = {
  noResult: (): CommandResult => ({ _tag: "NoResult" }),
  deletePrompted: (branch: Branch): CommandResult => ({
    _tag: "DeletePrompted",
    branch,
  }),
  deleteCancelled: (): CommandResult => ({ _tag: "DeleteCancelled" }),
  deleteRejectedCurrent: (branch: Branch): CommandResult => ({
    _tag: "DeleteRejectedCurrent",
    branch,
  }),
  deleteSucceeded: (branch: Branch): CommandResult => ({
    _tag: "DeleteSucceeded",
    branch,
  }),
  deleteFailed: (branch: Branch): CommandResult => ({
    _tag: "DeleteFailed",
    branch,
  }),
  refreshSucceeded: (): CommandResult => ({ _tag: "RefreshSucceeded" }),
  refreshFailed: (): CommandResult => ({ _tag: "RefreshFailed" }),
  commandFailed: (): CommandResult => ({ _tag: "CommandFailed" }),
  loadBranchesSucceeded: (): CommandResult => ({
    _tag: "LoadBranchesSucceeded",
  }),
  loadBranchesFailed: (): CommandResult => ({ _tag: "LoadBranchesFailed" }),
  switchBranchSucceeded: (branch: Branch): CommandResult => ({
    _tag: "SwitchBranchSucceeded",
    branch,
  }),
  switchBranchFailed: (branch: Branch): CommandResult => ({
    _tag: "SwitchBranchFailed",
    branch,
  }),
};

export const setCommand = (
  mode: Mode,
  keyName: string,
  selectedBranch: Branch | undefined,
): Command =>
  Match.value({ mode, keyName }).pipe(
    Match.when({ keyName: "q" }, Commands.quit),
    Match.when({ keyName: "r" }, Commands.refreshBranches),
    Match.when({ mode: { _tag: "Browsing" }, keyName: "d" }, () =>
      !selectedBranch
        ? Commands.noop()
        : selectedBranch.current
          ? Commands.rejectDeleteCurrent(selectedBranch)
          : Commands.promptDelete(selectedBranch),
    ),
    Match.when({ mode: { _tag: "ConfirmDelete" }, keyName: "y" }, ({ mode }) =>
      Commands.deleteBranch(mode.branch),
    ),
    Match.when(
      { mode: { _tag: "ConfirmDelete" }, keyName: "n" },
      Commands.cancelDelete,
    ),
    Match.when(
      { mode: { _tag: "ConfirmDelete" }, keyName: "escape" },
      Commands.cancelDelete,
    ),
    Match.orElse(Commands.noop),
  );
