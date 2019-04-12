/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*global jest, describe, beforeEach, it, expect*/

jest.disableAutomock();

describe('getMemberExpressionValuePath', () => {
  let getMemberExpressionValuePath;
  let statement;

  beforeEach(() => {
    getMemberExpressionValuePath = require('../getMemberExpressionValuePath')
      .default;
    ({ statement } = require('../../../tests/utils'));
  });

  describe('MethodExpression', () => {
    it('finds "normal" property definitions', () => {
      const def = statement(`
        var Foo = () => {};
        Foo.propTypes = {};
      `);

      expect(getMemberExpressionValuePath(def, 'propTypes')).toBe(
        def.parent.get('body', 1, 'expression', 'right'),
      );
    });

    it('takes the correct property definitions', () => {
      const def = statement(`
        var Foo = () => {};
        Foo.propTypes = {};
        Bar.propTypes = { unrelated: true };
      `);

      expect(getMemberExpressionValuePath(def, 'propTypes')).toBe(
        def.parent.get('body', 1, 'expression', 'right'),
      );
    });

    it('finds computed property definitions with literal keys', () => {
      const def = statement(`
        function Foo () {}
        Foo['render'] = () => {};
      `);

      expect(getMemberExpressionValuePath(def, 'render')).toBe(
        def.parent.get('body', 1, 'expression', 'right'),
      );
    });

    it('ignores computed property definitions with expression', () => {
      const def = statement(`
        var Foo = function Bar() {};
        Foo[imComputed] = () => {};
      `);

      expect(getMemberExpressionValuePath(def, 'imComputed')).not.toBeDefined();
    });
  });
  describe('TaggedTemplateLiteral', () => {
    it('finds "normal" property definitions', () => {
      const def = statement(`
        var Foo = foo\`bar\`
        Foo.propTypes = {};
      `);

      expect(getMemberExpressionValuePath(def, 'propTypes')).toBe(
        def.parent.get('body', 1, 'expression', 'right'),
      );
    });
  });
  describe('CallExpression', () => {
    it('finds "normal" property definitions', () => {
      const def = statement(`
        const Foo = system({is: "button"}, "space");
        Foo.propTypes = {};
      `);

      expect(getMemberExpressionValuePath(def, 'propTypes')).toBe(
        def.parent.get('body', 1, 'expression', 'right'),
      );
    });
  });
});
