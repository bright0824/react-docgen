import { parse } from '../../../tests/utils';
import isUnreachableFlowType from '../isUnreachableFlowType.js';
import { describe, expect, test } from 'vitest';

describe('isUnreachableFlowType', () => {
  test('considers Identifier as unreachable', () => {
    expect(isUnreachableFlowType(parse.expression('foo'))).toBe(true);
  });

  test('considers ImportDeclaration as unreachable', () => {
    expect(isUnreachableFlowType(parse.statement('import x from "";'))).toBe(
      true,
    );
  });

  test('considers CallExpression as unreachable', () => {
    expect(isUnreachableFlowType(parse.expression('foo()'))).toBe(true);
  });

  test('considers VariableDeclaration not as unreachable', () => {
    expect(isUnreachableFlowType(parse.statement('const x = 1;'))).toBe(false);
  });
});
