export type Branch = {
  readonly name: string;
};

export function parseBranches(output: string): readonly Branch[] {
  return output
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}
