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

jest.autoMockOff();

describe('getPropType', () => {
  var expression, statement;
  var getPropType;

  beforeEach(() => {
    getPropType = require('../getPropType');
    ({expression, statement} = require('../../../tests/utils'));
  });

  it('detects simple prop types', () => {
    var simplePropTypes = [
      'array',
      'bool',
      'func',
      'number',
      'object',
      'string',
      'any',
      'element',
      'node',
    ];

    simplePropTypes.forEach(
      type => expect(getPropType(expression('React.PropTypes.' + type)))
        .toEqual({name: type})
    );

    // It doesn't actually matter what the MemberExpression is
    simplePropTypes.forEach(
      type => expect(getPropType(expression('Foo.' + type + '.bar')))
        .toEqual({name: type})
    );

    // Doesn't even have to be a MemberExpression
    simplePropTypes.forEach(
      type => expect(getPropType(expression(type)))
        .toEqual({name: type})
    );
  });

  it('detects complex prop types', () => {
    expect(getPropType(expression('oneOf(["foo", "bar"])'))).toEqual({
      name: 'enum',
      value: [
        {value: '"foo"', computed: false},
        {value: '"bar"', computed: false},
      ],
    });

    // line comments are ignored
    expect(getPropType(expression('oneOf(["foo", // baz\n"bar"])'))).toEqual({
      name: 'enum',
      value: [
        {value: '"foo"', computed: false},
        {value: '"bar"', computed: false},
      ],
    });

    expect(getPropType(expression('oneOfType([number, bool])'))).toEqual({
      name: 'union',
      value: [
        {name: 'number'},
        {name: 'bool'},
      ],
    });

    // custom type
    expect(getPropType(expression('oneOfType([foo])'))).toEqual({
      name: 'union',
      value: [{name: 'custom', raw: 'foo'}],
    });

    // custom type
    expect(getPropType(expression('instanceOf(Foo)'))).toEqual({
      name: 'instanceOf',
      value: 'Foo',
    });

    expect(getPropType(expression('arrayOf(string)'))).toEqual({
      name: 'arrayOf',
      value: {name: 'string'},
    });

    expect(getPropType(expression('shape({foo: string, bar: bool})'))).toEqual({
      name: 'shape',
      value: {
        foo: {
          name: 'string',
        },
        bar: {
          name: 'bool',
        },
      },
    });

    // custom
    expect(getPropType(expression('shape({foo: xyz})'))).toEqual({
      name: 'shape',
      value: {
        foo: {
          name: 'custom',
          raw: 'xyz',
        },
      },
    });
  });

  it('resolves variables to their values', () => {
    var propTypeExpression = statement(`
      PropTypes.shape(shape);
      var shape = {bar: PropTypes.string};
    `).get('expression');

    expect(getPropType(propTypeExpression)).toEqual({
      name: 'shape',
      value: {
        bar: {name: 'string'},
      },
    });
  });

  it('detects custom validation functions', () => {
    expect(getPropType(expression('(function() {})'))).toEqual({
      name: 'custom',
      raw: '(function() {})',
    });

    expect(getPropType(expression('() => {}'))).toEqual({
      name: 'custom',
      raw: '() => {}',
    });
  });

});
