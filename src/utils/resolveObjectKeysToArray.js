/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import recast from 'recast';
import resolveToValue from './resolveToValue';

const {
  types: { ASTNode, NodePath, builders, namedTypes: types },
} = recast;

function isObjectKeysCall(node: ASTNode): boolean {
  return (
    types.CallExpression.check(node) &&
    node.arguments.length === 1 &&
    types.MemberExpression.check(node.callee) &&
    types.Identifier.check(node.callee.object) &&
    node.callee.object.name === 'Object' &&
    types.Identifier.check(node.callee.property) &&
    node.callee.property.name === 'keys'
  );
}

function isWhitelistedObjectProperty(prop) {
  return (
    (types.Property.check(prop) &&
      ((types.Identifier.check(prop.key) && !prop.computed) ||
        types.Literal.check(prop.key))) ||
    types.SpreadElement.check(prop)
  );
}

function isWhiteListedObjectTypeProperty(prop) {
  return (
    types.ObjectTypeProperty.check(prop) ||
    types.ObjectTypeSpreadProperty.check(prop) ||
    types.TSPropertySignature.check(prop)
  );
}

// Resolves an ObjectExpression or an ObjectTypeAnnotation
export function resolveObjectToNameArray(
  object: NodePath,
  raw: boolean = false,
): ?Array<string> {
  if (
    (types.ObjectExpression.check(object.value) &&
      object.value.properties.every(isWhitelistedObjectProperty)) ||
    (types.ObjectTypeAnnotation.check(object.value) &&
      object.value.properties.every(isWhiteListedObjectTypeProperty)) ||
    (types.TSTypeLiteral.check(object.value) &&
      object.value.members.every(isWhiteListedObjectTypeProperty))
  ) {
    let values = [];
    let error = false;
    const properties = types.TSTypeLiteral.check(object.value)
      ? object.get('members')
      : object.get('properties');
    properties.each(propPath => {
      if (error) return;
      const prop = propPath.value;

      if (
        types.Property.check(prop) ||
        types.ObjectTypeProperty.check(prop) ||
        types.TSPropertySignature.check(prop)
      ) {
        // Key is either Identifier or Literal
        const name = prop.key.name || (raw ? prop.key.raw : prop.key.value);

        values.push(name);
      } else if (
        types.SpreadElement.check(prop) ||
        types.ObjectTypeSpreadProperty.check(prop)
      ) {
        let spreadObject = resolveToValue(propPath.get('argument'));
        if (types.GenericTypeAnnotation.check(spreadObject.value)) {
          const typeAlias = resolveToValue(spreadObject.get('id'));
          if (types.ObjectTypeAnnotation.check(typeAlias.get('right').value)) {
            spreadObject = resolveToValue(typeAlias.get('right'));
          }
        }

        const spreadValues = resolveObjectToNameArray(spreadObject);
        if (!spreadValues) {
          error = true;
          return;
        }
        values = [...values, ...spreadValues];
      }
    });

    if (!error) {
      return values;
    }
  }

  return null;
}

/**
 * Returns an ArrayExpression which contains all the keys resolved from an object
 *
 * Ignores setters in objects
 *
 * Returns null in case of
 *  unresolvable spreads
 *  computed identifier keys
 */
export default function resolveObjectKeysToArray(path: NodePath): ?NodePath {
  const node = path.node;

  if (isObjectKeysCall(node)) {
    const objectExpression = resolveToValue(path.get('arguments').get(0));
    const values = resolveObjectToNameArray(objectExpression);

    if (values) {
      const nodes = values
        .filter((value, index, array) => array.indexOf(value) === index)
        .map(value => builders.literal(value));

      return new NodePath(builders.arrayExpression(nodes));
    }
  }

  return null;
}
