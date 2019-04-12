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
  types: { namedTypes: _types },
} = recast;

export default function resolveExportDeclaration(
  path: NodePath,
  types: Object = _types,
): Array<NodePath> {
  const definitions = [];
  if (path.node.default) {
    definitions.push(path.get('declaration'));
  } else if (path.node.declaration) {
    if (types.VariableDeclaration.check(path.node.declaration)) {
      path
        .get('declaration', 'declarations')
        .each(declarator => definitions.push(declarator));
    } else {
      definitions.push(path.get('declaration'));
    }
  } else if (path.node.specifiers) {
    path
      .get('specifiers')
      .each(specifier =>
        definitions.push(
          specifier.node.id ? specifier.get('id') : specifier.get('local'),
        ),
      );
  }
  return definitions.map(definition => resolveToValue(definition));
}
