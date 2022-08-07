import getMemberValuePath from '../utils/getMemberValuePath';
import getNameOrValue from '../utils/getNameOrValue';
import isReactForwardRefCall from '../utils/isReactForwardRefCall';
import resolveToValue from '../utils/resolveToValue';
import resolveFunctionDefinitionToReturnValue from '../utils/resolveFunctionDefinitionToReturnValue';
import type Documentation from '../Documentation';
import type { NodePath } from '@babel/traverse';
import type { Identifier } from '@babel/types';
import type { Handler } from '.';
import type { ComponentNode } from '../resolver';

const displayNameHandler: Handler = function (
  documentation: Documentation,
  componentDefinition: NodePath<ComponentNode>,
): void {
  let displayNamePath: NodePath | null = getMemberValuePath(
    componentDefinition,
    'displayName',
  );
  if (!displayNamePath) {
    // Function and class declarations need special treatment. The name of the
    // function / class is the displayName
    if (
      (componentDefinition.isClassDeclaration() ||
        componentDefinition.isFunctionDeclaration()) &&
      componentDefinition.has('id')
    ) {
      documentation.set(
        'displayName',
        getNameOrValue(componentDefinition.get('id') as NodePath<Identifier>),
      );
    } else if (
      componentDefinition.isArrowFunctionExpression() ||
      componentDefinition.isFunctionExpression() ||
      isReactForwardRefCall(componentDefinition)
    ) {
      let currentPath: NodePath = componentDefinition;
      while (currentPath.parentPath) {
        if (currentPath.parentPath.isVariableDeclarator()) {
          documentation.set(
            'displayName',
            getNameOrValue(currentPath.parentPath.get('id')),
          );
          return;
        } else if (currentPath.parentPath.isAssignmentExpression()) {
          const leftPath = currentPath.parentPath.get('left');
          if (leftPath.isIdentifier() || leftPath.isLiteral()) {
            documentation.set('displayName', getNameOrValue(leftPath));
            return;
          }
        }
        currentPath = currentPath.parentPath;
      }
    }
    return;
  }
  displayNamePath = resolveToValue(displayNamePath);

  // If display name is defined as function somehow (getter, property with function)
  // we resolve the return value of the function
  if (displayNamePath.isFunction()) {
    displayNamePath = resolveFunctionDefinitionToReturnValue(displayNamePath);
  }
  if (
    !displayNamePath ||
    (!displayNamePath.isStringLiteral() && !displayNamePath.isNumericLiteral())
  ) {
    return;
  }
  documentation.set('displayName', displayNamePath.node.value);
};

export default displayNameHandler;
