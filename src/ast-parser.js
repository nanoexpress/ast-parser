import { parse, convertArray, convertProperty } from "./helpers";
import { simple as simpleParse } from "acorn-walk";
import { resMethods } from "./core-methods";

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
  const expressionsMap = [];

  const parserMap = {
    ArrowFunctionExpression({ params }) {
      let index = 0;
      for (const { name, type, properties } of params) {
        if (type === "Identifier" && source[name] === undefined) {
          source[name] = REFERENCED;
        } else if (type === "ObjectPattern") {
          if (index > 0) {
            continue;
          }
          let tree = index === 0 ? "req" : "res";
          let link = source;

          link[tree] = REFERENCED;

          let parsed = convertArray(properties);

          if (Array.isArray(parsed[0])) {
            parsed = parsed.reduce((arr, item) => arr.concat(item));
          }

          if (parsed.length > 0) {
            link[tree] = {};
            link = link[tree];

            for (let i = 0, len = parsed.length; i < len; i++) {
              tree = parsed[i];

              link[tree] = USED;

              if (i === parsed.length - 1) {
                break;
              }

              if (link[tree] === USED) {
                link[tree] = {};
                link = link[tree];
              }
            }
          }
        }
        index++;
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

        if (!source[itemId]) {
          source[itemId] = {};
        }
        const infoItem = source[itemId];

        let infoValue;
        if (propKey) {
          if (
            !infoItem[propKey] ||
            infoItem[propKey] === REFERENCED ||
            infoItem[propKey] === USED
          ) {
            infoItem[propKey] = {};
          }
          infoValue = infoItem[propKey];
        } else {
          infoValue = infoItem[value];
        }

        if (propKey) {
          if (infoValue) {
            infoValue[value] = subtree ? USED : REFERENCED;
          }
        } else {
          infoItem[value] = subtree ? USED : REFERENCED;
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

                if (args.length > 1 && resMethods.indexOf(method) !== -1) {
                  const argsConverted = convertArray(args);

                  infoItem[method] = argsConverted;
                } else if (args.length > 1) {
                  const [key, result] = convertArray(args);
                  const [, resultType] = args.map((arg) => arg.type);

                  // If $reference was referenced by mismatch
                  // just ignore to improve performance
                  // and reduce cycle
                  if (
                    result.$reference &&
                    result.$reference[0] === undefined &&
                    result.$reference.length > 1
                  ) {
                    return null;
                  }

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

                  const expressionItem = expressionsMap.find(
                    (map) => map.link[value.name]
                  );

                  if (expressionItem) {
                    expressionItem.link[value.name] = USED;
                    infoItem[method] = {
                      $reference: expressionItem.$reference
                    };
                  } else {
                    const valueProperty = convertProperty(value);

                    if (value.type === "Identifier") {
                      infoItem[method] = USED;
                    } else if (value.type === "BinaryExpression") {
                      infoItem[method] = valueProperty;
                    } else if (value.type === "ObjectExpression") {
                      if (typeof infoItem[method] !== "object") {
                        infoItem[method] = {};
                        const infoValue = infoItem[method];

                        for (const key in valueProperty) {
                          const val = valueProperty[key];

                          let $refKey;
                          const expressionValue = expressionsMap.find(
                            (expression) => {
                              if (expression.$ref) {
                                const { $ref: rest, $reference } = expression;

                                if (
                                  $reference[$reference.length - 1] !== key &&
                                  rest[rest.length - 1] === key
                                ) {
                                  $refKey = $reference[$reference.length - 1];
                                }
                              }

                              return (
                                expression.link[key] || expression.link[$refKey]
                              );
                            }
                          );

                          if (expressionValue) {
                            let $ref = expressionValue.$reference;
                            const $refCharIndex = $ref.indexOf(
                              $ref[$ref.length - 1]
                            );

                            if ($refCharIndex !== -1) {
                              $ref = $ref.slice(0, $refCharIndex);
                            }

                            if ($refKey) {
                              $ref.push($refKey);

                              expressionValue.link[$refKey] = USED;
                              infoValue[$refKey] = {
                                $reference: $ref
                              };
                            } else {
                              $ref.push(key);

                              expressionValue.link[key] = USED;
                              infoValue[key] = {
                                $reference: $ref
                              };
                            }
                          } else {
                            infoValue[key] = val;
                          }
                        }
                      }
                    } else {
                      if (valueProperty === null) {
                        // Don't stop it here, keep passing
                      } else {
                        infoItem[method] = valueProperty;
                      }
                    }
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
                  let { $reference: ref } = initProperty;

                  let link = source;
                  let prevLink;
                  let lastProperty;
                  let reRef = false;

                  if (!ref) {
                    ref = convertArray(id.properties);
                    ref.unshift(
                      init.object && init.object.property
                        ? init.object.propety.name
                        : init.name
                    );

                    // console.log("$reRef", ref, declaration);
                    reRef = true;
                  }
                  if (!ref[0] && init.object) {
                    const { $reference: $reRef } = convertProperty(init.object);

                    ref = $reRef.concat(init.property.name);

                    ref = $reRef;
                  }

                  for (const property of ref) {
                    if (link[property]) {
                      prevLink = link;
                      lastProperty = property;
                      link = link[property];
                    }
                  }

                  if (link === REFERENCED || link === USED) {
                    link = {};
                    prevLink[lastProperty] = link;

                    const methodsRest = id.properties
                      ? convertArray(id.properties)
                      : [convertProperty(id)];
                    const $ref =
                      id.properties &&
                      ref.concat(id.properties.map((prop) => prop.value.name));

                    for (const method of methodsRest) {
                      link[method] = REFERENCED;
                    }
                    expressionsMap.push({
                      $reference: reRef ? ref : ref.concat(methodsRest),
                      $ref,
                      link
                    });
                  } else if (link) {
                    const methodsRest = id.properties
                      ? convertArray(id.properties)
                      : [convertProperty(id)];
                    const $ref =
                      id.properties &&
                      ref.concat(id.properties.map((prop) => prop.value.name));

                    for (const method of methodsRest) {
                      link[method] = REFERENCED;
                    }

                    expressionsMap.push({
                      $reference: reRef ? ref : ref.concat(methodsRest),
                      $ref,
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
  };

  simpleParse(parsed, parserMap);

  return source;
}
