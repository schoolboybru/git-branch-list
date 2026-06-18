import { ManagedRuntime } from "effect";
import { GitService } from "./services/git";
import type { Branch } from "./domain/branch";
import { useBranchList } from "./hooks/useBranchList";

const runtime = ManagedRuntime.make(GitService.Default);

export function App() {
  const { branches, status, setSelectedBranch, switchBranch } =
    useBranchList(runtime);

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
        ↑/↓ or j/k move enter switch d delete r refresh q qui
      </text>
      <text fg="#9cdcfe">{status}</text>
    </box>
  );
}
