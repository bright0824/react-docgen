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

import isUnreachableFlowType from '../utils/isUnreachableFlowType';
import recast from 'recast';
import resolveToValue from '../utils/resolveToValue';
import { unwrapUtilityType } from './flowUtilityTypes';

const {
  types: { namedTypes: types },
} = recast;

function tryResolveGenericTypeAnnotation(path: NodePath): ?NodePath {
  let typePath = unwrapUtilityType(path);

  if (types.GenericTypeAnnotation.check(typePath.node)) {
    typePath = resolveToValue(typePath.get('id'));
    if (isUnreachableFlowType(typePath)) {
      return;
    }

    return tryResolveGenericTypeAnnotation(typePath.get('right'));
  }

  return typePath;
}

/**
 * Given an React component (stateless or class) tries to find the
 * flow type for the props. If not found or not one of the supported
 * component types returns undefined.
 */
export default function resolveGenericTypeAnnotation(
  path: NodePath,
): ?NodePath {
  if (!path) return;

  const typePath = tryResolveGenericTypeAnnotation(path);

  if (!typePath || typePath === path) return;

  return typePath;
}
