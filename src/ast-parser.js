import { parse, convertArray, convertObject, convertProperty } from './helpers';
import { simple as simpleParse } from 'acorn-walk';

export const EXISTS = Symbol('EXISTS');
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
          source[name] = EXISTS;
        }
      }
    },
    MemberExpression({ object, property }) {
      const itemId = object.object ? object.object.name : object.name;

      if (itemId === 'req' || itemId === 'res') {
        const value = convertProperty(property);

        if (value === null) {
          return;
        }

        let propKey;
        const subtree = object.type === 'MemberExpression';

        if (object.property) {
          propKey = object.property.name;
        }

        if (!source[itemId] || subtree) {
          source[itemId] = {};
        }
        const infoItem = source[itemId];

        let infoValue;
        if (propKey) {
          if (!infoItem[propKey] || infoItem[propKey] === EXISTS) {
            infoItem[propKey] = {};
          }
          infoValue = infoItem[propKey];
        } else {
          infoValue = infoItem[value];
        }

        if (infoValue === undefined) {
          if (!subtree) {
            infoItem[value] = EXISTS;
          }
        } else if (subtree) {
          infoValue[value] = EXISTS;
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
            if (bodyItem.type === 'ExpressionStatement') {
              const { callee, arguments: args } = bodyItem.expression;

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

                for (const arg of args) {
                  if (infoValue === EXISTS || !infoValue) {
                    infoValue = {};
                    infoItem[method] = infoValue;
                  }

                  if (arg.type === 'ObjectExpression') {
                    if (arg.properties.length > 0) {
                      infoItem[method] = convertObject(arg.properties);
                    }
                  } else if (arg.type === 'ArrayExpression') {
                    infoItem[method] = convertArray(arg.elements);
                  } else if (arg.type === 'Literal') {
                    infoItem[method] = arg.value;
                  } else if (arg.type === 'CallExpression') {
                    infoItem[method] = convertProperty(arg);
                  } else if (arg.type === 'MemberExpression') {
                    infoItem[method] = convertProperty({
                      type: 'CallExpression',
                      callee: arg
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
