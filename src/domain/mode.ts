import type { Branch } from "./branch";

export type Mode =
  | { readonly _tag: "Browsing" }
  | { readonly _tag: "ConfirmDelete"; readonly branch: Branch };
