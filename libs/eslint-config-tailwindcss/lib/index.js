import betterTailwindCSS from "eslint-plugin-better-tailwindcss";

export default (options) => [
  {
    plugins: { "better-tailwindcss": betterTailwindCSS },
    settings: {
      "better-tailwindcss": {
        entryPoint: (options?.css ?? "") || "tailwind.css",
      },
    },
    rules: {
      ...betterTailwindCSS.configs.recommended.rules,
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
  },
];
