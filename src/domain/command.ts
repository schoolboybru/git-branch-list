import type { Branch } from "./branch";

export type Command =
  | { readonly _tag: "Quit" }
  | { readonly _tag: "RefreshBranches" }
  | { readonly _tag: "PromptDelete"; readonly branch: Branch }
  | { readonly _tag: "DeleteBranch"; readonly branch: Branch }
  | { readonly _tag: "CancelDelete" }
  | { readonly _tag: "RejectDeleteCurrent"; readonly branch: Branch }
  | { readonly _tag: "Noop" };

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
