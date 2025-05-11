import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a compatibility layer to support traditional ESLint config
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: ["src/types/generated/**", "dist/**", "node_modules/**", "**/dist/**", "**/node_modules/**"],
  },
  {
    files: ["*.ts", "*.tsx"],
  },
  ...compat.extends("airbnb-base"),
  ...compat.extends("prettier"),
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["tsconfig.json", "tsconfig.test.json", "examples/*/tsconfig.json"],
        ecmaVersion: "latest",
        sourceType: "module",
      },
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      quotes: ["error", "double"],
      "max-len": ["error", 140],
      "import/extensions": ["error", "never"],
      "import/no-commonjs": ["error", { allowRequire: false, allowPrimitiveModules: false }],
      "import/no-extraneous-dependencies": [
        "error",
        { devDependencies: true, optionalDependencies: true, peerDependencies: true },
      ],
      "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
      "max-classes-per-file": ["error", 10],
      "import/prefer-default-export": "off",
      "object-curly-newline": "off",
      // Replacing airbnb rule with following, to re-enable "ForOfStatement"
      "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"],
      "no-use-before-define": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-use-before-define": ["error", { functions: false, classes: false }],
      "@typescript-eslint/no-unused-vars": ["error"],
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".ts"],
        },
      },
    },
  },
];