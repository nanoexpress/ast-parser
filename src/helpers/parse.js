import { Parser } from "acorn";

export default function parse(fn) {
  try {
    return Parser.parse(fn.toString());
  } catch (e) {
    console.error(
      "[nanoexpress - AST-Parser] :: Preprocess",
      "Preprocessing failed due of incorrect input",
      "or some of syntax error at library"
    );
    return null;
  }
}
