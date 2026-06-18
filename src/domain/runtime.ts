import type { ManagedRuntime } from "effect";
import type { GitService } from "../services/git";

export type Runtime = ManagedRuntime.ManagedRuntime<GitService, never>;
