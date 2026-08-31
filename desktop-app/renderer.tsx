import React from "react";
import { createRoot } from "react-dom/client";
import Game from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("游戏画布没有准备好");

createRoot(root).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>,
);
