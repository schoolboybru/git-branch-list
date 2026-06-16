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
  | { readonly _tag: "Noop" };

const Commands = {
  quit: (): Command => ({ _tag: "Quit" }),
  refreshBranches: (): Command => ({ _tag: "RefreshBranches" }),
  promptDelete: (branch: Branch): Command => ({ _tag: "PromptDelete", branch }),
  deleteBranch: (branch: Branch): Command => ({ _tag: "DeleteBranch", branch }),
  cancelDelete: (): Command => ({ _tag: "CancelDelete" }),
  noop: (): Command => ({ _tag: "Noop" }),
};

const runtime = ManagedRuntime.make(GitService.Default);

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
      selectedBranch ? Commands.promptDelete(selectedBranch) : Commands.noop(),
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
            setSelectedBranch(branches[0]);
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
            setSelectedBranch(branches[0]);
            setMode({ _tag: "Browsing" });
            setStatus(`Deleted ${branch.name}`);
          });
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
          setSelectedBranch(branches[0]);
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
    <box flexDirection="column" borderStyle="rounded" padding={1} gap={1}>
      <text fg="#d7ba7d">Select a branch</text>
      <select
        focused
        width={40}
        height={10}
        showDescription={false}
        onChange={(_index, option) => {
          setSelectedBranch(option?.value as Branch | undefined);
        }}
        onSelect={async (_index, option) => {
          const branch = option?.value as Branch | undefined;
          if (!branch) return;

          setStatus(`Switching to ${branch.name}...`);

          const result = await runtime.runPromiseExit(
            GitService.switchBranch(branch),
          );

          Exit.match(result, {
            onSuccess: () => {
              setStatus(`Switched to ${branch.name}`);
            },
            onFailure: () => {
              setStatus(`Failed to switch to ${branch.name}`);
            },
          });
        }}
        options={branches.map((branch) => ({
          name: branch.name,
          description: "",
          value: branch,
        }))}
      />
      <text fg="#777777">
        ↑/↓ or j/k move enter switch d delete r refresh q quit
      </text>

      <text fg="#9cdcfe">{status}</text>
    </box>
  );
}
