/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */

/*global describe, it, expect*/

import { expression } from '../../../tests/utils';

import getMemberExpressionRoot from '../getMemberExpressionRoot';

describe('getMemberExpressionRoot', () => {
  it('returns the root of a member expression', () => {
    const root = getMemberExpressionRoot(expression('foo.bar.baz'));
    expect(root).toEqualASTNode(expression('foo'));
  });
});
