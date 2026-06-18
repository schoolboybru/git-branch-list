import { Effect, Exit } from "effect";
import type { Branch } from "../domain/branch";
import { GitService } from "../services/git";
import { useEffect, useState } from "react";
import type { Runtime } from "../domain/runtime";
import { CommandResults } from "../domain/command";

const selectDefaultBranch = (branches: readonly Branch[]) => branches[0];

const switchBranchAndReload = (branch: Branch) =>
  Effect.gen(function* () {
    yield* GitService.switchBranch(branch);
    return yield* GitService.listBranches();
  });

const deleteBranchAndReload = (branch: Branch) =>
  Effect.gen(function* () {
    yield* GitService.deleteBranch(branch);
    return yield* GitService.listBranches();
  });

export function useBranches(runtime: Runtime) {
  const [branches, setBranches] = useState<readonly Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();

  const replaceBranches = (
    branches: readonly Branch[],
    selectedName?: string,
  ) => {
    setBranches(branches);
    setSelectedBranch(
      selectedName
        ? (branches.find((branch) => branch.name === selectedName) ??
            selectDefaultBranch(branches))
        : selectDefaultBranch(branches),
    );
  };

  const loadBranches = async () => {
    const result = await runtime.runPromiseExit(GitService.listBranches());

    return Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches);
        return CommandResults.loadBranchesSucceeded();
      },
      onFailure: () => {
        return CommandResults.loadBranchesFailed();
      },
    });
  };

  const refreshBranches = async () => {
    const result = await runtime.runPromiseExit(GitService.listBranches());
    return Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches);
        return CommandResults.refreshSucceeded();
      },
      onFailure: () => {
        return CommandResults.refreshFailed();
      },
    });
  };

  const switchBranch = async (branch: Branch) => {
    const result = await runtime.runPromiseExit(switchBranchAndReload(branch));
    return Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches, branch.name);
        return CommandResults.switchBranchSucceeded(branch);
      },
      onFailure: () => {
        return CommandResults.switchBranchFailed(branch);
      },
    });
  };

  const deleteBranch = async (branch: Branch) => {
    const result = await runtime.runPromiseExit(deleteBranchAndReload(branch));
    return Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches, branch.name);
        return CommandResults.deleteSucceeded(branch);
      },
      onFailure: () => {
        return CommandResults.deleteFailed(branch);
      },
    });
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    loadBranches,
    refreshBranches,
    switchBranch,
    deleteBranch,
  };
}
