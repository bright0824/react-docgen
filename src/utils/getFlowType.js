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

/* eslint no-use-before-define: 0 */

import getPropertyName from './getPropertyName';
import printValue from './printValue';
import recast from 'recast';
import getTypeAnnotation from '../utils/getTypeAnnotation';
import resolveToValue from '../utils/resolveToValue';
import { resolveObjectExpressionToNameArray } from '../utils/resolveObjectKeysToArray';
import type {
  FlowTypeDescriptor,
  FlowElementsType,
  FlowFunctionSignatureType,
  FlowObjectSignatureType,
} from '../types';

const {
  types: { namedTypes: types },
} = recast;

const flowTypes = {
  AnyTypeAnnotation: 'any',
  BooleanTypeAnnotation: 'boolean',
  MixedTypeAnnotation: 'mixed',
  NullLiteralTypeAnnotation: 'null',
  NumberTypeAnnotation: 'number',
  StringTypeAnnotation: 'string',
  VoidTypeAnnotation: 'void',
};

const flowLiteralTypes = {
  BooleanLiteralTypeAnnotation: 1,
  NumberLiteralTypeAnnotation: 1,
  StringLiteralTypeAnnotation: 1,
};

const namedTypes = {
  ArrayTypeAnnotation: handleArrayTypeAnnotation,
  GenericTypeAnnotation: handleGenericTypeAnnotation,
  ObjectTypeAnnotation: handleObjectTypeAnnotation,
  UnionTypeAnnotation: handleUnionTypeAnnotation,
  NullableTypeAnnotation: handleNullableTypeAnnotation,
  FunctionTypeAnnotation: handleFunctionTypeAnnotation,
  IntersectionTypeAnnotation: handleIntersectionTypeAnnotation,
  TupleTypeAnnotation: handleTupleTypeAnnotation,
  TypeofTypeAnnotation: handleTypeofTypeAnnotation,
};

function getFlowTypeWithRequirements(path: NodePath): FlowTypeDescriptor {
  const type = getFlowTypeWithResolvedTypes(path);

  type.required = !path.parentPath.node.optional;

  return type;
}

function handleKeysHelper(path: NodePath): ?FlowElementsType {
  let value = path.get('typeParameters', 'params', 0);
  if (types.TypeofTypeAnnotation.check(value.node)) {
    value = value.get('argument', 'id');
  } else {
    value = value.get('id');
  }
  const resolvedPath = resolveToValue(value);
  if (resolvedPath && types.ObjectExpression.check(resolvedPath.node)) {
    const keys = resolveObjectExpressionToNameArray(resolvedPath, true);

    if (keys) {
      return {
        name: 'union',
        raw: printValue(path),
        elements: keys.map(key => ({ name: 'literal', value: key })),
      };
    }
  }

  return null;
}

function handleArrayTypeAnnotation(path: NodePath): FlowElementsType {
  return {
    name: 'Array',
    elements: [getFlowTypeWithResolvedTypes(path.get('elementType'))],
    raw: printValue(path),
  };
}

function handleGenericTypeAnnotation(path: NodePath): ?FlowTypeDescriptor {
  if (path.node.id.name === '$Keys' && path.node.typeParameters) {
    return handleKeysHelper(path);
  }

  let type: FlowTypeDescriptor;
  if (types.QualifiedTypeIdentifier.check(path.node.id)) {
    const id = path.get('id');

    if (id.node.qualification.name === 'React') {
      type = {
        name: `${id.node.qualification.name}${id.node.id.name}`,
        raw: printValue(id),
      };
    } else {
      type = { name: printValue(id).replace(/<.*>$/, '') };
    }
  } else {
    type = { name: path.node.id.name };
  }

  if (path.node.typeParameters) {
    const params = path.get('typeParameters').get('params');

    type = {
      ...type,
      elements: params.map(param => getFlowTypeWithResolvedTypes(param)),
      raw: printValue(path),
    };
  } else {
    const resolvedPath = resolveToValue(path.get('id'));
    if (resolvedPath && resolvedPath.node.right) {
      type = getFlowTypeWithResolvedTypes(resolvedPath.get('right'));
    }
  }

  return type;
}

function handleObjectTypeAnnotation(path: NodePath): FlowTypeDescriptor {
  const type: FlowObjectSignatureType = {
    name: 'signature',
    type: 'object',
    raw: printValue(path),
    signature: { properties: [] },
  };

  path.get('callProperties').each(param => {
    type.signature.constructor = getFlowTypeWithResolvedTypes(
      param.get('value'),
    );
  });

  path.get('indexers').each(param => {
    type.signature.properties.push({
      key: getFlowTypeWithResolvedTypes(param.get('key')),
      value: getFlowTypeWithRequirements(param.get('value')),
    });
  });

  path.get('properties').each(param => {
    type.signature.properties.push({
      key: getPropertyName(param),
      value: getFlowTypeWithRequirements(param.get('value')),
    });
  });

  return type;
}

function handleUnionTypeAnnotation(path: NodePath): FlowElementsType {
  return {
    name: 'union',
    raw: printValue(path),
    elements: path
      .get('types')
      .map(subType => getFlowTypeWithResolvedTypes(subType)),
  };
}

function handleIntersectionTypeAnnotation(path: NodePath): FlowElementsType {
  return {
    name: 'intersection',
    raw: printValue(path),
    elements: path
      .get('types')
      .map(subType => getFlowTypeWithResolvedTypes(subType)),
  };
}

function handleNullableTypeAnnotation(path: NodePath): ?FlowTypeDescriptor {
  const typeAnnotation = getTypeAnnotation(path);

  if (!typeAnnotation) return null;

  const type = getFlowTypeWithResolvedTypes(typeAnnotation);
  type.nullable = true;

  return type;
}

function handleFunctionTypeAnnotation(
  path: NodePath,
): FlowFunctionSignatureType {
  const type: FlowFunctionSignatureType = {
    name: 'signature',
    type: 'function',
    raw: printValue(path),
    signature: {
      arguments: [],
      return: getFlowTypeWithResolvedTypes(path.get('returnType')),
    },
  };

  path.get('params').each(param => {
    const typeAnnotation = getTypeAnnotation(param);
    if (!typeAnnotation) return;

    type.signature.arguments.push({
      name: param.node.name ? param.node.name.name : '',
      type: getFlowTypeWithResolvedTypes(typeAnnotation),
    });
  });

  return type;
}

function handleTupleTypeAnnotation(path: NodePath): FlowElementsType {
  const type: FlowElementsType = {
    name: 'tuple',
    raw: printValue(path),
    elements: [],
  };

  path.get('types').each(param => {
    type.elements.push(getFlowTypeWithResolvedTypes(param));
  });

  return type;
}

function handleTypeofTypeAnnotation(path: NodePath): FlowTypeDescriptor {
  return getFlowTypeWithResolvedTypes(path.get('argument'));
}

let visitedTypes = {};

function getFlowTypeWithResolvedTypes(path: NodePath): FlowTypeDescriptor {
  const node = path.node;
  let type: ?FlowTypeDescriptor;

  const isTypeAlias = types.TypeAlias.check(path.parentPath.node);
  // When we see a typealias mark it as visited so that the next
  // call of this function does not run into an endless loop
  if (isTypeAlias) {
    if (visitedTypes[path.parentPath.node.id.name] === true) {
      // if we are currently visiting this node then just return the name
      // as we are starting to endless loop
      return { name: path.parentPath.node.id.name };
    } else if (typeof visitedTypes[path.parentPath.node.id.name] === 'object') {
      // if we already resolved the type simple return it
      return visitedTypes[path.parentPath.node.id.name];
    }
    // mark the type as visited
    visitedTypes[path.parentPath.node.id.name] = true;
  }

  if (types.FlowType.check(node)) {
    if (node.type in flowTypes) {
      type = { name: flowTypes[node.type] };
    } else if (node.type in flowLiteralTypes) {
      type = { name: 'literal', value: node.raw || `${node.value}` };
    } else if (node.type in namedTypes) {
      type = namedTypes[node.type](path);
    }
  }

  if (isTypeAlias) {
    // mark the type as unvisited so that further calls can resolve the type again
    visitedTypes[path.parentPath.node.id.name] = type;
  }

  if (!type) {
    type = { name: 'unknown' };
  }

  return type;
}

/**
 * Tries to identify the flow type by inspecting the path for known
 * flow type names. This method doesn't check whether the found type is actually
 * existing. It simply assumes that a match is always valid.
 *
 * If there is no match, "unknown" is returned.
 */
export default function getFlowType(path: NodePath): FlowTypeDescriptor {
  // Empty visited types before an after run
  // Before: in case the detection threw and we rerun again
  // After: cleanup memory after we are done here
  visitedTypes = {};
  const type = getFlowTypeWithResolvedTypes(path);
  visitedTypes = {};

  return type;
}
