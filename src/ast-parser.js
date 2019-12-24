import { parse, convertArray, convertProperty } from "./helpers";
import { simple as simpleParse } from "acorn-walk";

export const REFERENCED = Symbol("REFERENCED");
export const USED = Symbol("USED");

export default function nanoexpressAstParser(
  rawFunction,
  inputSource,
  mergeSources
) {
  const parsed = parse(rawFunction);

  if (!parsed) {
    return null;
  }

  const source = inputSource
    ? mergeSources
      ? inputSource
      : Object.assign({}, inputSource)
    : {};

  const parserMap = {
    ArrowFunctionExpression({ params }) {
      for (const { name } of params) {
        if (source[name] === undefined) {
          source[name] = REFERENCED;
        }
      }
    },
    MemberExpression({ type, object, property }) {
      const itemId = object.object ? object.object.name : object.name;

      if (itemId === "req" || itemId === "res") {
        const value = convertProperty(property);

        if (value === null) {
          return;
        }

        let propKey;
        const subtree = type === "MemberExpression";

        if (object.property) {
          propKey = object.property.name;
        }

        if (!source[itemId] || subtree) {
          source[itemId] = {};
        }
        const infoItem = source[itemId];

        let infoValue;
        if (propKey) {
          if (!infoItem[propKey] || infoItem[propKey] === REFERENCED) {
            infoItem[propKey] = {};
          }
          infoValue = infoItem[propKey];
        } else {
          infoValue = infoItem[value];
        }

        if (infoValue === undefined) {
          if (!subtree) {
            if (propKey) {
              infoItem[propKey] = REFERENCED;
            } else {
              infoItem[value] = REFERENCED;
            }
          } else {
            if (propKey) {
              infoItem[propKey] = REFERENCED;
            } else {
              infoItem[value] = USED;
            }
          }
        } else if (subtree) {
          if (propKey) {
            infoItem[propKey] = USED;
          } else {
            infoItem[value] = USED;
          }
        }
      }
    },
    ExpressionStatement({ expression: { body, async, generator } }) {
      if (body) {
        const bodyContent = body.body;

        if (source.async === undefined) {
          source.async = async;
        }
        if (source.generator === undefined) {
          source.generator = generator;
        }

        if (bodyContent && bodyContent.length > 0) {
          const expressionsMap = [];
          for (const bodyItem of bodyContent) {
            if (bodyItem.type === "ExpressionStatement") {
              const { type, callee, arguments: args } = bodyItem.expression;

              if (callee && callee.object) {
                const itemId = callee.object.object
                  ? callee.object.object.name
                  : callee.object.name;
                const method = callee.object.property
                  ? callee.object.property.name
                  : callee.property.name;

                let infoItem = source[itemId];
                if (!infoItem) {
                  infoItem = {};
                  source[itemId] = infoItem;
                }

                if (args.length > 1) {
                  const [key, result] = convertArray(args);
                  const [, resultType] = args.map((arg) => arg.type);

                  infoItem[method] = {};
                  const infoValue = infoItem[method];

                  const expressionItem = expressionsMap.find(
                    (map) => map.link[result]
                  );
                  if (expressionItem) {
                    expressionItem.link[result] = USED;
                    infoValue[key] = { $reference: expressionItem.$reference };
                  } else {
                    infoValue[key] =
                      resultType === "Identifier"
                        ? { $Identifier: result }
                        : result;
                  }

                  expressionsMap.push(infoItem[method][key]);
                } else {
                  const value = args.shift();

                  if (value.type === "Identifier") {
                    infoItem[method] = USED;
                  } else {
                    infoItem[method] = convertProperty(value);
                  }
                }
              } else {
                if (type === "CallExpression") {
                  if (callee) {
                    const { name } = callee;

                    if (source[name] === REFERENCED) {
                      source[name] = USED;
                    }
                  }
                }
              }
            } else if (bodyItem.type === "VariableDeclaration") {
              const { declarations } = bodyItem;

              for (const declaration of declarations) {
                const { type, id, init } = declaration;

                if (type === "VariableDeclarator") {
                  const initProperty = convertProperty(init);

                  if (initProperty === null) {
                    continue;
                  }
                  const { $reference: ref } = initProperty;

                  let link = source;
                  let prevLink;
                  let lastProperty;
                  for (const property of ref) {
                    prevLink = link;
                    lastProperty = property;

                    link = link[property];
                  }

                  if (link === REFERENCED || link === USED) {
                    link = {};
                    prevLink[lastProperty] = link;

                    const methodsRest = convertArray(id.properties);

                    for (const method of methodsRest) {
                      link[method] = REFERENCED;

                      expressionsMap.push({
                        $reference: ref.concat(methodsRest),
                        link
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  simpleParse(parsed, parserMap);

  return source;
}
