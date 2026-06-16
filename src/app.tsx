import { Effect, Exit, ManagedRuntime, Match } from "effect";
import { GitService } from "./services/git";
import { useAppContext } from "@opentui/react";
import type { Branch } from "./domain/branch";
import { useEffect, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import type { Mode } from "./domain/mode";
import { type Command, Commands } from "./domain/command";
import { useBranches } from "./hooks/useBranches";

const runtime = ManagedRuntime.make(GitService.Default);

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
  const [mode, setMode] = useState<Mode>({ _tag: "Browsing" });
  const { keyHandler, renderer } = useAppContext();

  const {
    branches,
    selectedBranch,
    status,
    setStatus,
    setSelectedBranch,
    refreshBranches,
    switchBranch,
    deleteBranch,
  } = useBranches(runtime);

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
        Effect.promise(() => refreshBranches()),
      ),
      Match.tag("DeleteBranch", ({ branch }) =>
        Effect.promise(async () => {
          await deleteBranch(branch);
          setMode({ _tag: "Browsing" });
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

          await switchBranch(branch);
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
