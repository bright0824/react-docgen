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
  var displayNameHandler;
  var expression, statement;

  beforeEach(() => {
    ({expression, statement} = require('../../../tests/utils'));
    documentation = new (require('../../Documentation'));
    displayNameHandler = require('../displayNameHandler').default;
  });

  it('extracts the displayName', () => {
    var definition = expression('({displayName: "FooBar"})');
    displayNameHandler(documentation, definition);
    expect(documentation.displayName).toBe('FooBar');

    definition = statement(`
      class Foo {
        static displayName = "BarFoo";
      }
    `);
    displayNameHandler(documentation, definition);
    expect(documentation.displayName).toBe('BarFoo');
  });

  it('resolves identifiers', () => {
    var definition = statement(`
      ({displayName: name})
      var name = 'abc';
    `).get('expression');
    displayNameHandler(documentation, definition);
    expect(documentation.displayName).toBe('abc');

    definition = statement(`
      class Foo {
        static displayName = name;
      }
      var name = 'xyz';
    `);
    displayNameHandler(documentation, definition);
    expect(documentation.displayName).toBe('xyz');
  });

  it('ignores non-literal names', () => {
    var definition = expression('({displayName: foo.bar})');
    expect(() => displayNameHandler(documentation, definition)).not.toThrow();
    expect(documentation.displayName).not.toBeDefined();

    definition = statement(`
      class Foo {
        static displayName = foo.bar;
      }
    `);
    expect(() => displayNameHandler(documentation, definition)).not.toThrow();
    expect(documentation.displayName).not.toBeDefined();
  });

  describe('ClassDeclaration', () => {

    it('considers the class name', () => {
      const definition = statement(`
        class Foo {
        }
      `);
      expect(() => displayNameHandler(documentation, definition)).not.toThrow();
      expect(documentation.displayName).toBe('Foo');
    });

    it('considers a static displayName class property', () => {
      const definition = statement(`
        class Foo {
          static displayName = 'foo';
        }
      `);
      expect(() => displayNameHandler(documentation, definition)).not.toThrow();
      expect(documentation.displayName).toBe('foo');
    });

    it('considers static displayName getter', () => {
      const definition = statement(`
        class Foo {
          static get displayName() {
            return 'foo';
          }
        }
      `);
      expect(() => displayNameHandler(documentation, definition)).not.toThrow();
      expect(documentation.displayName).toBe('foo');
    });

    it('resolves variables in displayName getter', () => {
      const definition = statement(`
        class Foo {
          static get displayName() {
            return abc;
          }
        }
        const abc = 'bar';
      `);
      expect(() => displayNameHandler(documentation, definition)).not.toThrow();
      expect(documentation.displayName).toBe('bar');
    });

  });

});
