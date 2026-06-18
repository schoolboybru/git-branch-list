import { useState } from "react";
import type { Runtime } from "../domain/runtime";
import { useBranches } from "./useBranches";
import { useKeyCommands } from "./useKeyCommands";
import { statusFromCommandResult } from "../domain/status";
import type { CommandResult } from "../domain/command";
import type { Branch } from "../domain/branch";

export function useBranchList(runtime: Runtime) {
  const [status, setStatus] = useState<string>("Select a branch");
  const branchState = useBranches(runtime);

  const applyCommandResult = (result: CommandResult) => {
    const nextStatus = statusFromCommandResult(result);
    if (nextStatus) {
      setStatus(nextStatus);
    }
  };

  const switchBranch = async (branch: Branch) => {
    const result = await branchState.switchBranch(branch);
    applyCommandResult(result);
  };

  useKeyCommands({
    selectedBranch: branchState.selectedBranch,
    refreshBranches: branchState.refreshBranches,
    deleteBranch: branchState.deleteBranch,
    applyCommandResult,
  });

  return {
    ...branchState,
    status,
    switchBranch,
  };
}
