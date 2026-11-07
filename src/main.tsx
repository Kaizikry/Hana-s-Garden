import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/caprasimo";
import "@fontsource-variable/figtree";
import "./styles.css";
import { App } from "./App";

// Stops another site framing the keypad to trick clicks, since GitHub Pages can't send that header.
if (window.top !== window.self) window.top!.location.href = window.location.href;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
