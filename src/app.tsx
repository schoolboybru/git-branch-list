import { Effect, Exit, ManagedRuntime, Match } from "effect";
import { GitService } from "./services/git";
import { useAppContext } from "@opentui/react";
import type { Branch } from "./domain/branch";
import { useEffect, useState } from "react";
import type { KeyEvent } from "@opentui/core";

type Mode =
  | { readonly _tag: "Browsing" }
  | { readonly _tag: "ConfirmDelete"; readonly branch: Branch };

type Command =
  | { readonly _tag: "Quit" }
  | { readonly _tag: "RefreshBranches" }
  | { readonly _tag: "PromptDelete"; readonly branch: Branch }
  | { readonly _tag: "DeleteBranch"; readonly branch: Branch }
  | { readonly _tag: "CancelDelete" }
  | { readonly _tag: "RejectDeleteCurrent"; readonly branch: Branch }
  | { readonly _tag: "Noop" };

const Commands = {
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

const runtime = ManagedRuntime.make(GitService.Default);

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

const decide = (
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

export function App() {
  const [branches, setBranches] = useState<readonly Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();
  const [status, setStatus] = useState("Loading branches");
  const [mode, setMode] = useState<Mode>({ _tag: "Browsing" });
  const { keyHandler, renderer } = useAppContext();

  const selectDefaultBranch = (branches: readonly Branch[]) =>
    branches.find((branch) => !branch.current) ?? branches[0];

  const runCommand = (command: Command) =>
    Match.value(command).pipe(
      Match.tag("Quit", () =>
        Effect.sync(() => {
          renderer?.destroy();
        }),
      ),
      Match.tag("PromptDelete", ({ branch }) =>
        Effect.sync(() => {
          setMode({ _tag: "ConfirmDelete", branch });
          setStatus(`Delete ${branch.name}? y/n`);
        }),
      ),
      Match.tag("CancelDelete", () =>
        Effect.sync(() => {
          setMode({ _tag: "Browsing" });
          setStatus("Cancelled delete");
        }),
      ),
      Match.tag("RefreshBranches", () =>
        Effect.gen(function* () {
          yield* Effect.sync(() => {
            setStatus("Refreshing...");
          });
          const branches = yield* GitService.listBranches();
          yield* Effect.sync(() => {
            setBranches(branches);
            setSelectedBranch(selectDefaultBranch(branches));
            setStatus("Refreshed");
          });
        }),
      ),
      Match.tag("DeleteBranch", ({ branch }) =>
        Effect.gen(function* () {
          yield* Effect.sync(() => {
            setStatus(`Deleting ${branch.name}...`);
          });

          const branches = yield* deleteBranchAndReload(branch);

          yield* Effect.sync(() => {
            setBranches(branches);
            setSelectedBranch(selectDefaultBranch(branches));
            setMode({ _tag: "Browsing" });
            setStatus(`Deleted ${branch.name}`);
          });
        }),
      ),
      Match.tag("RejectDeleteCurrent", ({ branch }) =>
        Effect.sync(() => {
          setStatus(`Cannot delete current branch ${branch.name}`);
        }),
      ),
      Match.tag("Noop", () => Effect.void),
      Match.exhaustive,
    );

  useEffect(() => {
    runtime.runPromiseExit(GitService.listBranches()).then((result) => {
      Exit.match(result, {
        onSuccess: (branches) => {
          setBranches(branches);
          setSelectedBranch(selectDefaultBranch(branches));
          setStatus("Select a branch");
        },
        onFailure: () => {
          setStatus("Failed to load branches");
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!keyHandler) return;

    const onKeyPress = async (key: KeyEvent) => {
      const command = decide(mode, key.name, selectedBranch);

      const result = await runtime.runPromiseExit(runCommand(command));

      Exit.match(result, {
        onSuccess: () => {},
        onFailure: () => {
          setStatus("Command failed");
        },
      });
    };

    keyHandler.on("keypress", onKeyPress);
    return () => {
      keyHandler.off("keypress", onKeyPress);
    };
  }, [keyHandler, renderer, selectedBranch, mode]);

  return (
    <box flexDirection="column" borderStyle="rounded" padding={1} gap={0}>
      <text fg="#d7ba7d">Branches</text>
      <select
        focused
        width={48}
        height={Math.min(Math.max(1, branches.length), 12)}
        showDescription={false}
        showScrollIndicator
        wrapSelection
        textColor="#c8c8c8"
        focusedTextColor="#ffffff"
        selectedBackgroundColor="transparent"
        focusedBackgroundColor={"transparent"}
        onChange={(_index, option) => {
          setSelectedBranch(option?.value as Branch | undefined);
        }}
        onSelect={async (_index, option) => {
          const branch = option?.value as Branch | undefined;
          if (!branch) return;

          setStatus(`Switching to ${branch.name}...`);

          const result = await runtime.runPromiseExit(
            switchBranchAndReload(branch),
          );

          Exit.match(result, {
            onSuccess: () => {
              setBranches(branches);
              setSelectedBranch(
                branches.find((current) => current.name === branch.name) ??
                  selectDefaultBranch(branches),
              );
              setStatus(`Switched to ${branch.name}`);
            },
            onFailure: () => {
              setStatus(`Failed to switch to ${branch.name}`);
            },
          });
        }}
        options={branches.map((branch) => ({
          name: branch.current ? `${branch.name} *` : branch.name,
          description: "",
          value: branch,
        }))}
      />
      <text fg="#666666">
        ↑/↓ or j/k move enter switch d delete r refresh q quit
      </text>
      <text fg="#9cdcfe">{status}</text>
    </box>
  );
}
