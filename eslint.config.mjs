import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados / no código fuente:
    ".expo/**",
    ".expo-test/**",
    ".expo-shared/**",
    "_design_reference/**",
    "mobile/.expo/**",
    "mobile/.expo-test/**",
    "mobile/.expo-shared/**",
    "mobile/android/**",
    "mobile/ios/**",
    "mobile/dist/**",
  ]),
  // Los archivos de configuración de bundlers/builders usan require().
  {
    files: ["**/*.config.js", "**/*.config.mjs", "scripts/*.mjs", "src/proxy.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
