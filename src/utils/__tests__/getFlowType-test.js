/*
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */

/* global jest, describe, beforeEach, it, expect */

jest.disableAutomock();

describe('getFlowType', () => {
  var expression, statement;
  var getFlowType;

  beforeEach(() => {
    getFlowType = require('../getFlowType').default;
    ({expression, statement} = require('../../../tests/utils'));
  });

  it('detects simple types', () => {
    var simplePropTypes = [
      'string',
      'number',
      'boolean',
      'any',
      'mixed',
      'void',
      'Object',
      'Function',
      'Boolean',
      'String',
      'Number',
    ];

    simplePropTypes.forEach(
      type => {
        var typePath = expression('x: ' + type).get('typeAnnotation').get('typeAnnotation');
        expect(getFlowType(typePath)).toEqual({ name: type });
      }
    );
  });

  it('detects literal types', () => {
    var literalTypes = [
      '"foo"',
      1234,
      true,
    ];

    literalTypes.forEach(
      value => {
        var typePath = expression(`x: ${value}`).get('typeAnnotation').get('typeAnnotation');
        expect(getFlowType(typePath)).toEqual({ name: 'literal', value: `${value}` });
      }
    );
  });

  it('detects external type', () => {
    var typePath = expression('x: xyz').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({ name: 'xyz' });
  });
  it('detects external nullable type', () => {
    var typePath = expression('x: ?xyz').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({ name: 'xyz', nullable: true });
  });

  it('detects array type', () => {
    var typePath = expression('x: Array<number>').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({ name: 'Array', elements: [{ name: 'number' }], raw: 'Array<number>' });
  });

  it('detects array type with multiple types', () => {
    var typePath = expression('x: Array<number, xyz>').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({ name: 'Array', elements: [{ name: 'number' }, { name: 'xyz' }], raw: 'Array<number, xyz>' });
  });

  it('detects class type', () => {
    var typePath = expression('x: Class<Boolean>').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({ name: 'Class', elements: [{ name: 'Boolean' }], raw: 'Class<Boolean>' });
  });

  it('detects function type with subtype', () => {
    var typePath = expression('x: Function<xyz>').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'Function', elements: [{ name: 'xyz' }], raw: 'Function<xyz>' });
  });

  it('detects object types', () => {
    var typePath = expression('x: { a: string, b?: xyz }').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'signature', type: 'object', signature: {
      properties: [
        { key: 'a', value: { name: 'string', required: true } },
        { key: 'b', value: { name: 'xyz', required: false } },
      ],
    }, raw: '{ a: string, b?: xyz }'});
  });

  it('detects object types with maybe type', () => {
    var typePath = expression('x: { a: string, b: ?xyz }').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'signature', type: 'object', signature: {
      properties: [
        { key: 'a', value: { name: 'string', required: true } },
        { key: 'b', value: { name: 'xyz', nullable: true, required: true } },
      ],
    }, raw: '{ a: string, b: ?xyz }'});
  });

  it('detects union type', () => {
    var typePath = expression('x: string | xyz | "foo" | void').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'union', elements: [
      { name: 'string' },
      { name: 'xyz' },
      { name: 'literal', value: '"foo"' },
      { name: 'void' },
    ], raw: 'string | xyz | "foo" | void'});
  });

  it('detects intersection type', () => {
    var typePath = expression('x: string & xyz & "foo" & void').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'intersection', elements: [
      { name: 'string' },
      { name: 'xyz' },
      { name: 'literal', value: '"foo"' },
      { name: 'void' },
    ], raw: 'string & xyz & "foo" & void'});
  });

  it('detects function signature type', () => {
    var typePath = expression('x: (p1: number, p2: ?string) => boolean').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'signature', type: 'function', signature: {
      arguments: [
        { name: 'p1', type: { name: 'number' }},
        { name: 'p2', type: { name: 'string', nullable: true }},
      ],
      return: { name: 'boolean' },
    }, raw: '(p1: number, p2: ?string) => boolean'});
  });

  it('detects callable signature type', () => {
    var typePath = expression('x: { (str: string): string, token: string }').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'signature', type: 'object', signature: {
      constructor: {
        name: 'signature',
        type: 'function',
        signature: {
          arguments: [
            { name: 'str', type: { name: 'string' } },
          ],
          return: { name: 'string' },
        },
        raw: '(str: string): string',
      },
      properties: [
        { key: 'token', value: { name: 'string', required: true } },
      ],
    }, raw: '{ (str: string): string, token: string }'});
  });

  it('detects map signature', () => {
    var typePath = expression('x: { [key: string]: number, [key: "xl"]: string, token: "a" | "b" }').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'signature', type: 'object', signature: {
      properties: [
        { key: { name: 'string' }, value: { name: 'number', required: true } },
        { key: { name: 'literal', value: '"xl"' }, value: { name: 'string', required: true } },
        { key: 'token', value: { name: 'union', required: true, raw: '"a" | "b"', elements: [ { name: 'literal', value: '"a"' }, { name: 'literal', value: '"b"' } ] } },
      ],
    }, raw: '{ [key: string]: number, [key: "xl"]: string, token: "a" | "b" }'});
  });

  it('detects tuple signature', () => {
    var typePath = expression('x: [string, number]').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'tuple', elements: [
      { name: 'string' },
      { name: 'number' },
    ], raw: '[string, number]'});
  });

  it('detects tuple in union signature', () => {
    var typePath = expression('x: [string, number] | [number, string]').get('typeAnnotation').get('typeAnnotation');
    expect(getFlowType(typePath)).toEqual({name: 'union', elements: [
      { name: 'tuple', elements: [ { name: 'string' }, { name: 'number' }], raw: '[string, number]' },
      { name: 'tuple', elements: [ { name: 'number' }, { name: 'string' }], raw: '[number, string]' },
    ], raw: '[string, number] | [number, string]'});
  });

  it('resolves types in scope', () => {
    var typePath = statement(`
      var x: MyType = 2;

      type MyType = string;
    `).get('declarations', 0).get('id').get('typeAnnotation').get('typeAnnotation');

    expect(getFlowType(typePath)).toEqual({ name: 'string' });
  });
});
