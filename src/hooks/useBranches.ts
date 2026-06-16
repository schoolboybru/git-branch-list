import { Effect, Exit, ManagedRuntime } from "effect";
import type { Branch } from "../domain/branch";
import { GitService } from "../services/git";
import { useEffect, useState } from "react";

const selectDefaultBranch = (branches: readonly Branch[]) =>
  branches.find((branch) => !branch.current) ?? branches[0];

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

type Runtime = ManagedRuntime.ManagedRuntime<GitService, never>;

export function useBranches(runtime: Runtime) {
  const [branches, setBranches] = useState<readonly Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();
  const [status, setStatus] = useState("Loading branches");

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

    Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches);
        setStatus("Select a branch");
      },
      onFailure: () => {
        setStatus("Failed to load branches");
      },
    });
  };

  const refreshBranches = async () => {
    setStatus("Refreshing...");

    const result = await runtime.runPromiseExit(GitService.listBranches());
    Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches);
        setStatus("Refreshed");
      },
      onFailure: () => {
        setStatus("Failed to refresh branches");
      },
    });
  };

  const switchBranch = async (branch: Branch) => {
    setStatus(`Switching to ${branch.name}...`);

    const result = await runtime.runPromiseExit(switchBranchAndReload(branch));
    Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches, branch.name);
        setStatus(`Switched to ${branch.name}`);
      },
      onFailure: () => {
        setStatus(`Failed to switch to ${branch.name}`);
      },
    });
  };

  const deleteBranch = async (branch: Branch) => {
    setStatus(`Deleting ${branch.name}...`);

    const result = await runtime.runPromiseExit(deleteBranchAndReload(branch));
    Exit.match(result, {
      onSuccess: (branches) => {
        replaceBranches(branches, branch.name);
        setStatus(`Deleted ${branch.name}`);
      },
      onFailure: () => {
        setStatus(`Failed to delete ${branch.name}`);
      },
    });
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  return {
    branches,
    selectedBranch,
    status,
    setStatus,
    setSelectedBranch,
    loadBranches,
    refreshBranches,
    switchBranch,
    deleteBranch,
  };
}
