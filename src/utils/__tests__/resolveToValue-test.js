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

describe('resolveToValue', () => {
  var builders;
  var utils;
  var resolveToValue;

  function parse(src) {
    var root = utils.parse(src);
    return root.get('body', root.node.body.length - 1, 'expression');
  }

  beforeEach(() => {
    var recast = require('recast');
    builders = recast.types.builders;
    resolveToValue = require('../resolveToValue').default;
    utils = require('../../../tests/utils');
  });

  it('resolves simple variable declarations', () => {
    var path = parse([
      'var foo  = 42;',
      'foo;',
    ].join('\n'));
    expect(resolveToValue(path).node).toEqualASTNode(builders.literal(42));
  });

  it('resolves object destructuring', () => {
    var path = parse([
      'var {foo: {bar: baz}} = bar;',
      'baz;',
    ].join('\n'));

    // Node should be equal to bar.foo.bar
    expect(resolveToValue(path).node).toEqualASTNode(
      builders.memberExpression(
        builders.memberExpression(
          builders.identifier('bar'),
          builders.identifier('foo')
        ),
        builders.identifier('bar')
      )
    );
  });

  it('handles SpreadProperties properly', () => {
    var path = parse([
      'var {foo: {bar}, ...baz} = bar;',
      'baz;',
    ].join('\n'));

    expect(resolveToValue(path).node).toEqualASTNode(path.node);
  });

  it('returns the original path if it cannot be resolved', () => {
    var path = parse([
      'function foo() {}',
      'foo()',
    ].join('\n'));

    expect(resolveToValue(path).node).toEqualASTNode(path.node);
  });

  it('resolves variable declarators to their init value', () => {
    var path = utils.parse('var foo = 42;').get('body', 0, 'declarations', 0);

    expect(resolveToValue(path).node).toEqualASTNode(builders.literal(42));
  });

  it('resolves to class declarations', () => {
    var program = utils.parse(`
      class Foo {}
      Foo;
    `);
    expect(resolveToValue(program.get('body', 1, 'expression')).node.type)
      .toBe('ClassDeclaration');
  });

  it('resolves to class function declaration', () => {
    var program = utils.parse(`
      function foo() {}
      foo;
    `);
    expect(resolveToValue(program.get('body', 1, 'expression')).node.type)
      .toBe('FunctionDeclaration');
  });

  describe('ImportDeclaration', () => {

    it('resolves default import references to the import declaration', () => {
      var path = parse([
        'import foo from "Foo"',
        'foo;',
      ].join('\n'));

      expect(resolveToValue(path).node.type).toBe('ImportDeclaration');
    });

    it('resolves named import references to the import declaration', () => {
      var path = parse([
        'import {foo} from "Foo"',
        'foo;',
      ].join('\n'));

      expect(resolveToValue(path).node.type).toBe('ImportDeclaration');
    });

    it('resolves aliased import references to the import declaration', () => {
      var path = parse([
        'import {foo as bar} from "Foo"',
        'bar;',
      ].join('\n'));

      expect(resolveToValue(path).node.type).toBe('ImportDeclaration');
    });

  });

});
