/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Documentation from '../Documentation';

import getMemberValuePath from '../utils/getMemberValuePath';
import recast from 'recast';
import resolveToValue from '../utils/resolveToValue';
import setPropDescription from '../utils/setPropDescription';

const {
  types: { namedTypes: types },
} = recast;

function resolveDocumentation(
  documentation: Documentation,
  path: NodePath,
): void {
  if (!types.ObjectExpression.check(path.node)) {
    return;
  }

  path.get('properties').each(propertyPath => {
    if (types.Property.check(propertyPath.node)) {
      setPropDescription(documentation, propertyPath);
    } else if (types.SpreadElement.check(propertyPath.node)) {
      const resolvedValuePath = resolveToValue(propertyPath.get('argument'));
      resolveDocumentation(documentation, resolvedValuePath);
    }
  });
}

export default function propDocBlockHandler(
  documentation: Documentation,
  path: NodePath,
) {
  let propTypesPath = getMemberValuePath(path, 'propTypes');
  if (!propTypesPath) {
    return;
  }
  propTypesPath = resolveToValue(propTypesPath);
  if (!propTypesPath) {
    return;
  }

  resolveDocumentation(documentation, propTypesPath);
}
