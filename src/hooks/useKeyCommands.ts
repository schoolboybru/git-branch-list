import { Effect, Exit, Match } from "effect";
import type { Branch } from "../domain/branch";
import {
  CommandResults,
  setCommand,
  type Command,
  type CommandResult,
} from "../domain/command";
import type { Mode } from "../domain/mode";
import { useEffect, useState } from "react";
import { useAppContext } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface UseKeyCommandsInput {
  selectedBranch: Branch | undefined;
  refreshBranches: () => Promise<CommandResult>;
  deleteBranch: (branch: Branch) => Promise<CommandResult>;
  applyCommandResult: (result: CommandResult) => void;
}

export function useKeyCommands({
  selectedBranch,
  refreshBranches,
  deleteBranch,
  applyCommandResult,
}: UseKeyCommandsInput) {
  const [mode, setMode] = useState<Mode>({ _tag: "Browsing" });
  const { keyHandler, renderer } = useAppContext();

  useEffect(() => {
    if (!keyHandler) return;

    const runCommand = (command: Command) =>
      Match.value(command).pipe(
        Match.tag("Quit", () =>
          Effect.sync(() => {
            renderer?.destroy();
            return CommandResults.noResult();
          }),
        ),
        Match.tag("PromptDelete", ({ branch }) =>
          Effect.sync(() => {
            setMode({ _tag: "ConfirmDelete", branch });
            return CommandResults.deletePrompted(branch);
          }),
        ),
        Match.tag("CancelDelete", () =>
          Effect.sync(() => {
            setMode({ _tag: "Browsing" });
            return CommandResults.deleteCancelled();
          }),
        ),
        Match.tag("RefreshBranches", () =>
          Effect.promise(() => refreshBranches()),
        ),
        Match.tag("DeleteBranch", ({ branch }) =>
          Effect.promise(async () => {
            const result = await deleteBranch(branch);
            setMode({ _tag: "Browsing" });
            return result;
          }),
        ),
        Match.tag("RejectDeleteCurrent", ({ branch }) =>
          Effect.sync(() => {
            return CommandResults.deleteRejectedCurrent(branch);
          }),
        ),
        Match.tag("Noop", () => Effect.succeed(CommandResults.noResult())),
        Match.exhaustive,
      );

    const onKeyPress = async (key: KeyEvent) => {
      const command = setCommand(mode, key.name, selectedBranch);

      const result = await Effect.runPromiseExit(runCommand(command));

      Exit.match(result, {
        onSuccess: applyCommandResult,
        onFailure: () => {
          applyCommandResult(CommandResults.commandFailed());
        },
      });
    };

    keyHandler.on("keypress", onKeyPress);
    return () => {
      keyHandler.off("keypress", onKeyPress);
    };
  }, [
    keyHandler,
    renderer,
    selectedBranch,
    mode,
    refreshBranches,
    deleteBranch,
  ]);

  return;
}
