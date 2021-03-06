const globalScopes = {
  Buffer
};

// eslint-disable-next-line no-unused-vars
function convertGlobalScope([$main, $method, $methodsRest], values) {
  let _chain = null;

  if (
    values &&
    values.some((value) => value.$reference || value.length === undefined)
  ) {
    return values.map((scopes) => {
      if (scopes.length === undefined) {
        scopes.$callee = [$main, $method, $methodsRest];
      }
      return scopes;
    });
  }

  if (globalScopes[$main]) {
    _chain = globalScopes[$main];
  }
  _chain = _chain[$method](values.shift());
  if (_chain && $methodsRest) {
    const _chainCheck = _chain[$methodsRest];

    const _checkValue = values.shift();
    if (typeof _chainCheck === "function") {
      _chain = _checkValue
        ? _chainCheck.call(_chain, _checkValue)
        : _chainCheck.call(_chain);
    } else {
      _chain = _checkValue ? _chainCheck[_checkValue] : _chainCheck;
    }
  }

  return _chain;
}

function convertProperty({
  type,
  name,
  key,
  value,
  properties,
  elements,
  object,
  property,
  callee,
  arguments: args,
  left,
  operator,
  right
}) {
  if (type === "Identifier") {
    return name;
  } else if (type === "Literal") {
    return value;
  } else if (type === "Property") {
    if (key.type !== value.type) {
      if (value.properties) {
        if (value.type === "ObjectPattern") {
          const propKey = convertProperty(key);
          const propValue = convertArray(value.properties);

          if (propValue[0] !== propKey) {
            propValue.unshift(propKey);
          }
          return propValue;
        }
      }
    }
    return convertProperty(key.type === value.type ? key : value);
  } else if (type === "MemberExpression") {
    if (object.callee) {
      const ref = convertProperty(object.callee);
      ref.$reference.push(property.name);
      ref.$args = object.arguments.map(convertProperty);

      if (globalScopes[ref.$reference[0]]) {
        return convertGlobalScope(ref.$reference, ref.$args);
      }

      return ref;
    }

    if (globalScopes[object.name] && args) {
      return convertGlobalScope(
        [object.name, property.name],
        args.map(convertProperty)
      );
    }

    return {
      $reference: [object.name, property.name]
    };
  } else if (type === "ObjectExpression") {
    return convertObject(properties);
  } else if (type === "ArrayExpression") {
    return convertArray(elements);
  } else if (type === "BinaryExpression") {
    return convertBinary(left, operator, right);
  } else if (type === "CallExpression") {
    if (callee.arguments && args) {
      callee.arguments = args.concat(callee.arguments);
    } else if (!callee.arguments && args) {
      callee.arguments = args;
    }
    return convertProperty(callee);
  } else {
    return null;
  }
}
function convertBinary(left, operator, right) {
  const leftProperty = convertProperty(left);
  const rightProperty = convertProperty(right);

  if (operator === "+") {
    return leftProperty + rightProperty;
  }

  throw new Error(
    `Current Binary Operator ${operator} on
    Left ${leftProperty} for Right ${rightProperty} operator`
  );
}
function convertObject(properties) {
  const empty = {};
  for (const property of properties) {
    empty[property.key.name] = convertProperty(property);
  }
  return empty;
}
function convertArray(elements) {
  return elements.map(convertProperty);
}

export { convertGlobalScope, convertProperty, convertArray, convertObject };
