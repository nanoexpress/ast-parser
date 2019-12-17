import resolve from "rollup-plugin-node-resolve";
import pkg from "./package.json";

const dependencies = Object.keys(pkg.dependencies);

const plugins = [
  resolve({
    preferBuiltins: true,
    mainFields: ["module", "main"],
    extensions: [".mjs", ".js", ".json"],
    exclude: "node_modules/**"
  })
];

export default [
  {
    input: "./src/ast-parser.js",
    output: {
      format: "cjs",
      file: "./build/ast-parser.js",
      esModule: false,
      sourcemap: true
    },
    external: dependencies,
    plugins
  }
];
