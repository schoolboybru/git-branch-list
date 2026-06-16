import { createRoot } from "@opentui/react";
import { App } from "./app";
import { createCliRenderer } from "@opentui/core";

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
