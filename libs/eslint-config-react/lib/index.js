import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default (options) => {
  const additionalRules = [];
  switch (options?.preset) {
    case "React Router": {
      additionalRules.push({
        files: ["app/entry.client.*", "app/entry.server.*"],
        rules: {
          "react/jsx-filename-extension": [
            "error",
            { allow: "always", extensions: [".jsx", ".tsx"] },
          ],
        },
      });
      break;
    }
  }
  return [
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    {
      settings: { react: { version: "detect" } },
      rules: {
        "react/prop-types": "off",
        "react/display-name": "off",
        "react/self-closing-comp": "error",
        "react/jsx-no-useless-fragment": "error",
        "react/jsx-curly-brace-presence": "error",
        "react/jsx-boolean-value": "error",
        "react/jsx-filename-extension": [
          "error",
          { allow: "as-needed", extensions: [".jsx", ".tsx"] },
        ],
        "react/jsx-sort-props": [
          "error",
          {
            locale: "en",
            reservedFirst: true,
            shorthandFirst: true,
            callbacksLast: true,
          },
        ],
      },
    },
    reactHooks.configs.flat.recommended,
    {
      rules: {
        "react-hooks/exhaustive-deps": [
          "error",
          { additionalHooks: "(useCustomEffect|useCustomEvent)" },
        ],
      },
    },
    jsxA11y.flatConfigs.recommended,
    ...additionalRules,
  ];
};
