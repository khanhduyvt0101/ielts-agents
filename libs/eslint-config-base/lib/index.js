import js from "@eslint/js";
import ts from "typescript-eslint";
import esm from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import prettier from "eslint-config-prettier";
import path from "node:path";

const generatedLibs = ["utils", "compose-refs", "format", "id"];

const submoduleMessage = (path) =>
  `Don't import submodules. Only import the module's index file using '${path}/<module>/index.ts(x)'. Export internal code via the index file if it's meant to be used outside the module, or move it to lib/<module> to make it a reusable internal module if it's used across multiple places.`;

export default (options) => {
  const restrictedImports = [
    {
      regex: "\\.$",
      message:
        "Don't use '.' to import the module's index file. Use '#./lib/<module>/index.ts(x)' instead.",
    },
    {
      regex: "^\\./index\\.tsx?$",
      message:
        "Don't use './index.ts(x)' to import the module's index file. Use '#./lib/<module>/index.ts(x)' instead.",
    },
    {
      regex: "^~/.+\\.(jsx?|tsx?)$",
      message:
        "Don't use file extensions in ~/* imports. For example, use '~/components/ui/button' instead of '~/components/ui/button.tsx', or '~/hooks/use-theme' instead of '~/hooks/use-theme.ts'. Only #* imports should have file extensions.",
    },
    {
      regex: "^#\\./(?!lib)[^/]+/(?!index\\.tsx?$).*$",
      message:
        "Only place internal modules in lib/<module>. For example, use '#./lib/auth/index.ts' instead of '#./auth/index.ts', or '#./lib/something.tsx' instead of '#./somewhere/something.tsx'. Only exceptions are generated code in ~/hooks and ~/components.",
    },
    ...generatedLibs.map((lib) => ({
      regex: `^#\\./lib/${lib}(\\.tsx?)?$`,
      message: `Use '~/lib/${lib}' instead of '#./lib/${lib}.ts(x)'.`,
    })),
  ];
  const noImportSameFolderPrefixes = ["", "lib/"];
  switch (options?.preset) {
    case "React Router": {
      restrictedImports.push(
        {
          regex: "^\\./\\.client/[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("./.client"),
        },
        {
          regex: "^\\./\\.server/[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("./.server"),
        },
        {
          regex: "^\\./(?!\\.client/|\\.server/)[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("."),
        },
        {
          regex: "^#\\./lib/\\.client/[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("#./lib/.client"),
        },
        {
          regex: "^#\\./lib/\\.server/[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("#./lib/.server"),
        },
        {
          regex:
            "^#\\./lib/(?!\\.client/|\\.server/)[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("#./lib"),
        },
      );
      noImportSameFolderPrefixes.push("lib/.client/", "lib/.server/");
      break;
    }
    default: {
      restrictedImports.push(
        {
          regex: "^\\./[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("."),
        },
        {
          regex: "^#\\./lib/[^/]+/(?!index\\.tsx?$).*$",
          message: submoduleMessage("#./lib"),
        },
      );
      break;
    }
  }
  return [
    {
      ignores: [
        "**/*.css",
        "**/*.js",
        "**/*.jsx",
        "**/*.[cm]js",
        "**/.git",
        "**/.nx",
        "**/.husky",
        "**/.vscode",
        "**/.playwright-mcp",
        "**/.api-extractor",
        "**/dist",
        "**/.react-router",
        "**/build",
        "**/next-env.d.ts",
        "**/.next",
        "**/out",
        "**/.vercel",
        "**/drizzle",
        "**/hooks",
        "**/components",
        ...generatedLibs.map((lib) => `**/lib/${lib}.ts`),
      ],
    },
    js.configs.recommended,
    {
      rules: {
        "no-restricted-imports": ["error", { patterns: restrictedImports }],
        "no-restricted-globals": [
          "error",
          "window",
          "self",
          "global",
          "globalThis",
        ],
        "no-useless-rename": "error",
        "no-useless-return": "error",
        "object-shorthand": "error",
        "arrow-body-style": "error",
      },
    },
    ts.configs.strictTypeChecked,
    ts.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
      },
      rules: {
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-invalid-void-type": "off",
        "@typescript-eslint/no-unsafe-enum-comparison": "off",
        "@typescript-eslint/only-throw-error": "off",
        "@typescript-eslint/prefer-promise-reject-errors": "off",
        "@typescript-eslint/no-unnecessary-type-parameters": "off",
        "@typescript-eslint/no-import-type-side-effects": "error",
        "@typescript-eslint/no-namespace": [
          "error",
          { allowDeclarations: true },
        ],
        "@typescript-eslint/no-empty-object-type": [
          "error",
          { allowObjectTypes: "always" },
        ],
        "@typescript-eslint/no-restricted-types": [
          "error",
          {
            types: {
              Omit: {
                message: "Use `Except` from `type-fest` instead",
                suggest: ["Except"],
              },
            },
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { ignoreRestSiblings: true },
        ],
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          { allowNumber: true, allowBoolean: true },
        ],
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": true,
            "ts-ignore": "allow-with-description",
            "ts-nocheck": "allow-with-description",
          },
        ],
      },
    },
    esm.flatConfigs.recommended,
    esm.flatConfigs.typescript,
    {
      languageOptions: { ecmaVersion: 2024 },
      settings: {
        "import/resolver": {
          typescript: {
            project: path.join(process.cwd(), "tsconfig.json"),
            bun: false,
            alwaysTryTypes: false,
          },
        },
      },
      rules: {
        "import/no-cycle": "error",
        "import/no-self-import": "error",
        "import/no-useless-path-segments": "error",
        "import/first": "error",
        "import/newline-after-import": "error",
        "import/namespace": ["error", { allowComputed: true }],
        "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
        "import/extensions": [
          "error",
          "ignorePackages",
          {
            ignorePackages: true,
            checkTypeImports: true,
            pathGroupOverrides: [{ pattern: "~/**", action: "ignore" }],
          },
        ],
      },
    },
    unicorn.configs.recommended,
    {
      rules: {
        "unicorn/no-null": "off",
        "unicorn/no-nested-ternary": "off",
        "unicorn/no-process-exit": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/prefer-global-this": "off",
        "unicorn/prefer-at": "off",
      },
    },
    {
      plugins: { "simple-import-sort": simpleImportSort },
      rules: {
        "simple-import-sort/imports": [
          "error",
          {
            groups: [
              ["^\\u0000[^#.~]"], // External side-effects
              ["^\\u0000#[^.]", "^\\u0000~"], // Generated side-effects
              ["^\\u0000#\\."], // Internal side-effects
              ["^\\u0000\\.\\."], // Parent side-effects
              ["^\\u0000\\.[^.]"], // Relative side-effects
              ["^[^#.~].*\\u0000$"], // External types
              ["^#[^.].*\\u0000$", "^~.*\\u0000$"], // Generated types
              ["^#\\..*\\u0000$"], // Internal types
              ["^\\.\\..*\\u0000$"], // Parent types
              ["^\\.[^.].*\\u0000$"], // Relative types
              ["^[^#.~]"], // External modules
              ["^#[^.]", "^~"], // Generated modules
              ["^#\\."], // Internal modules
              ["^\\.\\."], // Parent modules
              ["^\\.[^.]"], // Relative modules
              ["^\\..*\\.module\\.s?css$"], // Relative styles
            ],
          },
        ],
        "simple-import-sort/exports": "error",
      },
    },
    {
      plugins: { "no-relative-import-paths": noRelativeImportPaths },
      rules: {
        "no-relative-import-paths/no-relative-import-paths": [
          "error",
          { prefix: "#.", allowSameFolder: true },
        ],
      },
    },
    {
      files: noImportSameFolderPrefixes.map(
        (prefix) => `${prefix}*.{js,jsx,ts,tsx}`,
      ),
      rules: {
        "no-relative-import-paths/no-relative-import-paths": [
          "error",
          { prefix: "#.", allowSameFolder: false },
        ],
      },
    },
    {
      files: ["**/*.stories.{js,jsx,ts,tsx}"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
      },
    },
    prettier,
    {
      rules: {
        "lines-around-directive": "error",
        curly: ["error", "multi-or-nest", "consistent"],
        quotes: ["error", "double", { avoidEscape: true }],
      },
    },
  ];
};
