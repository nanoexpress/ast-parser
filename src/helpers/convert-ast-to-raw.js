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

  if ($main === 'Buffer') {
    _chain = Buffer[$method](values.shift());
  }
  if (_chain && $methodsRest) {
    const _chainCheck = _chain[$methodsRest];

    const _checkValue = values.shift();
    if (typeof _chainCheck === 'function') {
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
  value,
  properties,
  elements,
  object,
  property,
  callee,
  arguments: args
}) {
  const str = JSON.stringify(
    { type, name, value, properties, elements, object, property, callee, args },
    null,
    4
  );

  // str.indexOf('"byteLength') > -1 && console.log('$byte', str);
  // str.indexOf('body') > -1 && console.log('$req.body', str);

  if (type === 'Identifier') {
    return name;
  } else if (type === 'Literal') {
    return value;
  } else if (type === 'MemberExpression') {
    if (object.callee) {
      const ref = convertProperty(object.callee);
      ref.$reference.push(property.name);
      ref.$args = object.arguments.map(convertProperty);

      return ref;
    }
    return {
      $reference: [object.name, property.name]
    };
  } else if (type === 'ObjectExpression') {
    return convertObject(properties);
  } else if (type === 'ArrayExpression') {
    return convertArray(elements);
  } else if (type === 'Property') {
    return convertProperty(value);
  } else if (type === 'CallExpression') {
    const { $reference: calleeReference, $args } = convertProperty(callee);
    const callValue = args && args.map(convertProperty);
    const callArgument =
      callValue && $args ? callValue.concat($args) : callValue || $args;

    return convertGlobalScope(calleeReference, callArgument);
  } else {
    return null;
  }
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
