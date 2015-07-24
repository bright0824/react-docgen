/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 *
 */

import recast from 'recast';

var {
  types: {
    NodePath,
    builders,
    namedTypes: types
  }
} = recast;

function buildMemberExpressionFromPattern(path: NodePath): ?NodePath {
  var node = path.node;
  if (types.Property.check(node)) {
    var objPath = buildMemberExpressionFromPattern(path.parent);
    if (objPath) {
      return new NodePath(
        builders.memberExpression(
          objPath.node,
          node.key,
          types.Literal.check(node.key)
        ),
        objPath
      );
    }
  } else if (types.ObjectPattern.check(node)) {
    return buildMemberExpressionFromPattern(path.parent);
  } else if (types.VariableDeclarator.check(node)) {
    return path.get('init');
  }
  return null;
}

/**
 * If the path is an identifier, it is resolved in the scope chain.
 * If it is an assignment expression, it resolves to the right hand side.
 *
 * Else the path itself is returned.
 */
export default function resolveToValue(path: NodePath): NodePath {
  var node = path.node;
  if (types.VariableDeclarator.check(node)) {
     if (node.init) {
       return resolveToValue(path.get('init'));
     }
  } else if (
    types.ImportDefaultSpecifier.check(node) ||
    types.ImportSpecifier.check(node)
  ) {
    return path.parentPath;
  } else if (types.AssignmentExpression.check(node)) {
    if (node.operator === '=') {
      return resolveToValue(node.get('right'));
    }
  } else if (types.Identifier.check(node)) {
    if ((types.ClassDeclaration.check(path.parentPath.node) ||
        types.ClassExpression.check(path.parentPath.node) ||
        types.Function.check(path.parentPath.node)) &&
        path.parentPath.get('id') === path) {
      return path.parentPath;
    }

    var scope = path.scope.lookup(node.name);
    if (scope) {
      var bindings = scope.getBindings()[node.name];
      if (bindings.length > 0) {
        var resultPath = scope.getBindings()[node.name][0];
        var parentPath = resultPath.parent;
        if (types.ImportDefaultSpecifier.check(parentPath.node) ||
            types.ImportSpecifier.check(parentPath.node) ||
            types.VariableDeclarator.check(parentPath.node)
        ) {
          resultPath = parentPath;
        } else if (types.Property.check(parentPath.node)) {
          // must be inside a pattern
          var memberExpressionPath = buildMemberExpressionFromPattern(
            parentPath
          );
          if (memberExpressionPath) {
            return memberExpressionPath;
          }
        }
        return resultPath.node !== path.node ?
          resolveToValue(resultPath) :
          path;
      }
    }
  }
  return path;
}
