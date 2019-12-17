import { parse, convertArray, convertObject, convertProperty } from "./helpers";
import { simple as simpleParse } from "acorn-walk";

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

  simpleParse(parsed, {
    ArrowFunctionExpression({ params }) {
      for (const { name } of params) {
        if (source[name] === undefined) {
          source[name] = true;
        }
      }
    },
    MemberExpression({ object, property }) {
      const itemId = object.object ? object.object.name : object.name;

      if (itemId === "req" || itemId === "res") {
        const value = convertProperty(property);

        if (value === null) {
          return;
        }

        let propKey;
        const subtree = object.type === "MemberExpression";

        if (object.property) {
          propKey = object.property.name;
        }

        if (!source[itemId] || subtree) {
          source[itemId] = {};
        }
        const infoItem = source[itemId];

        let infoValue;
        if (propKey) {
          if (!infoItem[propKey] || infoItem[propKey] === true) {
            infoItem[propKey] = {};
          }
          infoValue = infoItem[propKey];
        } else {
          infoValue = infoItem[value];
        }

        if (infoValue === undefined) {
          if (!subtree) {
            infoItem[value] = true;
          }
        } else if (subtree) {
          infoValue[value] = true;
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
          for (const { type, expression } of bodyContent) {
            if (type === "ExpressionStatement") {
              const { callee, arguments: args } = expression;

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

                let infoValue = infoItem[method];

                for (const {
                  type,
                  properties,
                  elements,
                  value,
                  callee,
                  arguments: childArgs
                } of args) {
                  if (infoValue === true || !infoValue) {
                    infoValue = {};
                    infoItem[method] = infoValue;
                  }

                  if (type === "ObjectExpression") {
                    if (properties.length > 0) {
                      infoItem[method] = convertObject(properties);
                    }
                  } else if (type === "ArrayExpression") {
                    infoItem[method] = convertArray(elements);
                  } else if (type === "Literal") {
                    infoItem[method] = value;
                  } else if (type === "CallExpression") {
                    infoItem[method] = convertProperty({
                      type,
                      callee,
                      arguments: childArgs
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return source;
}
