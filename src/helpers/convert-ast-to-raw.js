// eslint-disable-next-line no-unused-vars
function convertGlobalScope([$main, $method, $methodsRest], value) {
  if ($main === "Buffer") {
    return Buffer[$method](...value);
  }

  return null;
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
  if (type === "Identifier") {
    return name;
  } else if (type === "Literal") {
    return value;
  } else if (type === "MemberExpression") {
    return {
      $reference: [object.name, property.name]
    };
  } else if (type === "ObjectExpression") {
    return convertObject(properties);
  } else if (type === "ArrayExpression") {
    return convertArray(elements);
  } else if (type === "Property") {
    return convertProperty(value);
  } else if (type === "CallExpression") {
    const { $reference: calleeReference } = convertProperty(callee);
    const value = args.map(convertProperty);

    return convertGlobalScope(calleeReference, value);
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

export { convertProperty, convertArray, convertObject };
