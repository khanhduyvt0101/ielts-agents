import { defineConfig } from "eslint/config";
import base from "eslint-config-base";
import react from "eslint-config-react";
import tailwindcss from "eslint-config-tailwindcss";
import query from "@tanstack/eslint-plugin-query";

const options = { preset: "React Router", css: "lib/styles.css" };

export default defineConfig(
  base(options),
  react(options),
  tailwindcss(options),
  query.configs["flat/recommended"],
);
