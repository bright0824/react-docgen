/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { namedTypes as t } from 'ast-types';
import getMemberValuePath from '../utils/getMemberValuePath';
import resolveToModule from '../utils/resolveToModule';
import resolveToValue from '../utils/resolveToValue';
import type Documentation from '../Documentation';
import type { Parser } from '../babelParser';
import type { Importer } from '../types';

/**
 * It resolves the path to its module name and adds it to the "composes" entry
 * in the documentation.
 */
function amendComposes(documentation, path) {
  const moduleName = resolveToModule(path);
  if (moduleName) {
    documentation.addComposes(moduleName);
  }
}

function processObjectExpression(documentation, path, importer) {
  path.get('properties').each(function(propertyPath) {
    switch (propertyPath.node.type) {
      case t.SpreadElement.name:
        amendComposes(
          documentation,
          resolveToValue(propertyPath.get('argument'), importer),
        );
        break;
    }
  });
}

export default function propTypeCompositionHandler(
  documentation: Documentation,
  path: NodePath,
  parser: Parser,
  importer: Importer,
) {
  let propTypesPath = getMemberValuePath(path, 'propTypes');
  if (!propTypesPath) {
    return;
  }
  propTypesPath = resolveToValue(propTypesPath, importer);
  if (!propTypesPath) {
    return;
  }

  switch (propTypesPath.node.type) {
    case t.ObjectExpression.name:
      processObjectExpression(documentation, propTypesPath, importer);
      break;
    default:
      amendComposes(documentation, propTypesPath);
      break;
  }
}
