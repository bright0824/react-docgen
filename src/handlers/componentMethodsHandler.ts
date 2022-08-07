import getMemberValuePath from '../utils/getMemberValuePath';
import type { MethodNodePath } from '../utils/getMethodDocumentation';
import getMethodDocumentation from '../utils/getMethodDocumentation';
import isReactComponentClass from '../utils/isReactComponentClass';
import isReactComponentMethod from '../utils/isReactComponentMethod';
import type Documentation from '../Documentation';
import match from '../utils/match';
import { traverseShallow } from '../utils/traverse';
import resolveToValue from '../utils/resolveToValue';
import type { NodePath } from '@babel/traverse';
import type { AssignmentExpression, Identifier } from '@babel/types';

/**
 * The following values/constructs are considered methods:
 *
 * - Method declarations in classes (except "constructor" and React lifecycle
 *   methods
 * - Public class fields in classes whose value are a functions
 * - Object properties whose values are functions
 */
function isMethod(path: NodePath): boolean {
  let isProbablyMethod =
    (path.isClassMethod() && path.node.kind !== 'constructor') ||
    path.isObjectMethod();

  if (
    !isProbablyMethod &&
    (path.isClassProperty() || path.isObjectProperty())
  ) {
    const value = resolveToValue(path.get('value') as NodePath);
    isProbablyMethod = value.isFunction();
  }

  return isProbablyMethod && !isReactComponentMethod(path);
}

function findAssignedMethods(
  path: NodePath,
  idPath: NodePath<Identifier | null | undefined>,
): Array<NodePath<AssignmentExpression>> {
  const results: Array<NodePath<AssignmentExpression>> = [];

  if (!idPath.hasNode() || !idPath.isIdentifier()) {
    return results;
  }

  const name = idPath.node.name;
  const idScope = idPath.scope.getBinding(idPath.node.name)?.scope;

  traverseShallow(path, {
    AssignmentExpression(assignmentPath) {
      const node = assignmentPath.node;
      if (
        match(node.left, {
          type: 'MemberExpression',
          object: { type: 'Identifier', name },
        }) &&
        assignmentPath.scope.getBinding(name)?.scope === idScope &&
        resolveToValue(assignmentPath.get('right')).isFunction()
      ) {
        results.push(assignmentPath);
        assignmentPath.skip();
      }
    },
  });

  return results;
}

/**
 * Extract all flow types for the methods of a react component. Doesn't
 * return any react specific lifecycle methods.
 */
export default function componentMethodsHandler(
  documentation: Documentation,
  path: NodePath,
): void {
  // Extract all methods from the class or object.
  let methodPaths: Array<{ path: MethodNodePath; isStatic?: boolean }> = [];
  if (isReactComponentClass(path)) {
    methodPaths = (
      path
        .get('body')
        .get('body')
        .filter(body => isMethod(body)) as MethodNodePath[]
    ).map(p => ({ path: p }));
  } else if (path.isObjectExpression()) {
    methodPaths = (
      path
        .get('properties')
        .filter(props => isMethod(props)) as MethodNodePath[]
    ).map(p => ({ path: p }));

    // Add the statics object properties.
    const statics = getMemberValuePath(path, 'statics');
    if (statics && statics.isObjectExpression()) {
      statics.get('properties').forEach(property => {
        if (isMethod(property)) {
          methodPaths.push({
            path: property as MethodNodePath,
            isStatic: true,
          });
        }
      });
    }
  } else if (
    path.parentPath &&
    path.parentPath.isVariableDeclarator() &&
    path.parentPath.node.init === path.node &&
    path.parentPath.get('id').isIdentifier()
  ) {
    methodPaths = findAssignedMethods(
      path.parentPath.scope.path,
      path.parentPath.get('id') as NodePath<Identifier>,
    ).map(p => ({ path: p }));
  } else if (
    path.parentPath &&
    path.parentPath.isAssignmentExpression() &&
    path.parentPath.node.right === path.node &&
    path.parentPath.get('left').isIdentifier()
  ) {
    methodPaths = findAssignedMethods(
      path.parentPath.scope.path,
      path.parentPath.get('left') as NodePath<Identifier>,
    ).map(p => ({ path: p }));
  } else if (path.isFunctionDeclaration()) {
    methodPaths = findAssignedMethods(
      path.parentPath.scope.path,
      path.get('id'),
    ).map(p => ({ path: p }));
  }

  documentation.set(
    'methods',
    methodPaths
      .map(({ path: p, isStatic }) => getMethodDocumentation(p, { isStatic }))
      .filter(Boolean),
  );
}
