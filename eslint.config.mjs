import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: ["**/*.json"],
		plugins: { json },
		language: "json/jsonc",
		languageOptions: {
			allowTrailingCommas: true,
		},
	},
	tseslint.configs.recommended,
	tseslint.configs.stylistic,
	{
		rules: {
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/prefer-for-of": "off",
		},
	},
	eslintConfigPrettier,
]);
