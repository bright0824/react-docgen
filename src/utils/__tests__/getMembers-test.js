/*
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */

/*global jest, describe, beforeEach, it, expect*/

jest.disableAutomock();

describe('getMembers', () => {
  var expression;
  var getMembers;
  var memberExpressionPath;

  beforeEach(() => {
    getMembers = require('../getMembers').default;
    ({expression} = require('../../../tests/utils'));
    memberExpressionPath = expression('foo.bar(123)(456)[baz][42]');
  });

  it('finds all "members" "inside" a MemberExpression', () => {
    var members = getMembers(memberExpressionPath);

    //bar(123)
    expect(members[0].path.node.name).toEqual('bar');
    expect(members[0].computed).toBe(false);
    expect(members[0].argumentsPath.get(0).node.value).toEqual(123);
    //[baz]
    expect(members[1].path.node.name).toEqual('baz');
    expect(members[1].computed).toBe(true);
    expect(members[1].argumentsPath).toBe(null);
    //[42]
    expect(members[2].path.node.value).toEqual(42);
    expect(members[2].computed).toBe(true);
    expect(members[2].argumentsPath).toBe(null);
  });

});
