/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import isExportsOrModuleAssignment from '../utils/isExportsOrModuleAssignment';
import isReactComponentClass from '../utils/isReactComponentClass';
import isReactCreateClassCall from '../utils/isReactCreateClassCall';
import normalizeClassDefinition from '../utils/normalizeClassDefinition';
import resolveExportDeclaration from '../utils/resolveExportDeclaration';
import resolveToValue from '../utils/resolveToValue';

var ERROR_MULTIPLE_DEFINITIONS =
  'Multiple exported component definitions found.';

function ignore() {
  return false;
}

function isComponentDefinition(path) {
  return isReactCreateClassCall(path) || isReactComponentClass(path);
}

function resolveDefinition(definition, types) {
  if (isReactCreateClassCall(definition)) {
    // return argument
    var resolvedPath = resolveToValue(definition.get('arguments', 0));
    if (types.ObjectExpression.check(resolvedPath.node)) {
      return resolvedPath;
    }
  } else if(isReactComponentClass(definition)) {
    normalizeClassDefinition(definition);
    return definition;
  }
  return null;
}

/**
 * Given an AST, this function tries to find the exported component definition.
 *
 * The component definition is either the ObjectExpression passed to
 * `React.createClass` or a `class` definition extending `React.Component` or
 * having a `render()` method.
 *
 * If a definition is part of the following statements, it is considered to be
 * exported:
 *
 * modules.exports = Defintion;
 * exports.foo = Definition;
 * export default Definition;
 * export var Definition = ...;
 */
export default function findExportedComponentDefinition(
  ast: ASTNode,
  recast: Object
): ?NodePath {
  var types = recast.types.namedTypes;
  var definition;

  function exportDeclaration(path) {
    var definitions = resolveExportDeclaration(path, types)
      .filter(isComponentDefinition);

    if (definitions.length === 0) {
      return false;
    }
    if (definitions.length > 1 || definition) {
      // If a file exports multiple components, ... complain!
      throw new Error(ERROR_MULTIPLE_DEFINITIONS);
    }
    definition = resolveDefinition(definitions[0], types);
    return false;
  }

  recast.visit(ast, {
    visitFunctionDeclaration: ignore,
    visitFunctionExpression: ignore,
    visitClassDeclaration: ignore,
    visitClassExpression: ignore,
    visitIfStatement: ignore,
    visitWithStatement: ignore,
    visitSwitchStatement: ignore,
    visitCatchCause: ignore,
    visitWhileStatement: ignore,
    visitDoWhileStatement: ignore,
    visitForStatement: ignore,
    visitForInStatement: ignore,

    visitExportDeclaration: exportDeclaration,
    visitExportNamedDeclaration: exportDeclaration,
    visitExportDefaultDeclaration: exportDeclaration,

    visitAssignmentExpression: function(path) {
      // Ignore anything that is not `exports.X = ...;` or
      // `module.exports = ...;`
      if (!isExportsOrModuleAssignment(path)) {
        return false;
      }
      // Resolve the value of the right hand side. It should resolve to a call
      // expression, something like React.createClass
      path = resolveToValue(path.get('right'));
      if (!isComponentDefinition(path)) {
        return false;
      }
      if (definition) {
        // If a file exports multiple components, ... complain!
        throw new Error(ERROR_MULTIPLE_DEFINITIONS);
      }
      definition = resolveDefinition(path, types);
      return false;
    },
  });

  return definition;
}
