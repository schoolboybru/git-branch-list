export type Branch = {
  readonly name: string;
  readonly current: boolean;
};

export function parseBranches(output: string): readonly Branch[] {
  return output
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      current: line.startsWith("*"),
      name: line.slice(2).trim(),
    }));
}
