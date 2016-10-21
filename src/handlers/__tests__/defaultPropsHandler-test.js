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
jest.mock('../../Documentation');

describe('defaultPropsHandler', () => {
  var documentation;
  var defaultPropsHandler;
  var parse;

  beforeEach(() => {
    ({parse} = require('../../../tests/utils'));
    documentation = new (require('../../Documentation'));
    defaultPropsHandler = require('../defaultPropsHandler').default;
  });

  function test(definition) {
    defaultPropsHandler(documentation, definition);
    expect(documentation.descriptors).toEqual({
      foo: {
        defaultValue: {
          value: '"bar"',
          computed: false,
        },
      },
      bar: {
        defaultValue: {
          value: '42',
          computed: false,
        },
      },
      baz: {
        defaultValue: {
          value: '["foo", "bar"]',
          computed: false,
        },
      },
      abc: {
        defaultValue: {
          value: '{xyz: abc.def, 123: 42}',
          computed: false,
        },
      },
    });
  }

  describe('ObjectExpression', () => {
    it('should find prop default values that are literals', () => {
      var src = `
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              bar: 42,
              baz: ["foo", "bar"],
              abc: {xyz: abc.def, 123: 42}
            };
          }
        })
      `;
      test(parse(src).get('body', 0, 'expression'));
    });
  });

  describe('ClassDeclaration with static defaultProps', () => {
    it('should find prop default values that are literals', () => {
      var src = `
        class Foo {
          static defaultProps = {
            foo: "bar",
            bar: 42,
            baz: ["foo", "bar"],
            abc: {xyz: abc.def, 123: 42}
          };
        }
      `;
      test(parse(src).get('body', 0));
    });

    it('should find prop default values that are imported variables', () => {
      var src = `
        import ImportedComponent from './ImportedComponent';

        class Foo {
          static defaultProps = {
            foo: ImportedComponent,
          };
        }
      `;
      defaultPropsHandler(documentation, parse(src).get('body', 1));
      expect(documentation.descriptors).toEqual({
        foo: {
          defaultValue: {
            value: 'ImportedComponent',
            computed: true,
          },
        },
      });
    });
  });

  describe('ClassExpression with static defaultProps', () => {
    it('should find prop default values that are literals', () => {
      var src = `
        var Bar = class {
          static defaultProps = {
            foo: "bar",
            bar: 42,
            baz: ["foo", "bar"],
            abc: {xyz: abc.def, 123: 42}
          };
      }`;
      test(parse(src).get('body', 0, 'declarations', 0, 'init'));
    });
  });

  it('should only consider Property nodes, not e.g. spread properties', () => {
    var src = `
      ({
        getDefaultProps: function() {
          return {
            ...Foo.bar,
            bar: 42,
          };
        }
      })
    `;
    let definition = parse(src).get('body', 0, 'expression');
    expect(() => defaultPropsHandler(documentation, definition))
      .not.toThrow();
    expect(documentation.descriptors).toEqual({
      bar: {
        defaultValue: {
          value: '42',
          computed: false,
        },
      },
    });
  });

  describe('Functional components with default params', () => {
    it('should find default props that are literals', () => {
      var src = `
        ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc = {xyz: abc.def, 123: 42}
        }) => <div />
      `;
      test(parse(src).get('body', 0, 'expression'));
    });

    it('should override with defaultProps if available', () => {
      var src = `
        var Foo = ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc = 'test'
        }) => <div />
        Foo.defaultProps = { abc: {xyz: abc.def, 123: 42} };
      `;
      test(parse(src).get('body', 0, 'declarations', 0, 'init'));
    });

    it('should work with aliases', () => {
      var src = `
        ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc: defg = {xyz: abc.def, 123: 42}
        }) => <div />
      `;
      test(parse(src).get('body', 0, 'expression'));
    });

    it('should find prop default values that are imported variables', () => {
      var src = `
        import ImportedComponent from './ImportedComponent';

        ({
          foo = ImportedComponent,
        }) => <div />
      `;
      defaultPropsHandler(documentation, parse(src).get('body', 1, 'expression'));

      expect(documentation.descriptors).toEqual({
        foo: {
          defaultValue: {
            value: 'ImportedComponent',
            computed: true,
          },
        },
      });
    });

    it('should work with no defaults', () => {
      var src = `
        ({ foo }) => <div />
      `;
      defaultPropsHandler(documentation, parse(src).get('body', 0, 'expression'));
      expect(documentation.descriptors).toEqual({});
    });
  });
});
