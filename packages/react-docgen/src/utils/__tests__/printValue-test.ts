import type { NodePath } from '@babel/traverse';
import type { ExpressionStatement, TSInterfaceDeclaration } from '@babel/types';
import { parse, parseTypescript } from '../../../tests/utils';
import printValue from '../printValue.js';
import { describe, expect, test } from 'vitest';

describe('printValue', () => {
  function pathFromSource(source: string): NodePath {
    return parse.statement<ExpressionStatement>(source).get('expression');
  }

  test('does not print leading comments', () => {
    expect(printValue(pathFromSource('//foo\nbar'))).toEqual('bar');
  });

  test('does not print trailing comments', () => {
    expect(printValue(pathFromSource('bar//foo'))).toEqual('bar');
  });

  test('deindents code', () => {
    expect(
      printValue(
        pathFromSource(`    (    function () {
      return x;
    })`),
      ),
    ).toMatchSnapshot();
  });

  [',', ';'].forEach((char) => {
    test(`removes trailing ${char} for TsConstructSignatureDeclaration`, () => {
      const path = parseTypescript
        .statement<TSInterfaceDeclaration>(
          `interface A { new (x:number)${char} }`,
        )
        .get('body.body.0') as NodePath;

      expect(printValue(path)).toMatchSnapshot();
    });

    test(`removes trailing ${char} for TsIndexSignature`, () => {
      const path = parseTypescript
        .statement<TSInterfaceDeclaration>(
          `interface A { [x:string]: number${char} }`,
        )
        .get('body.body.0') as NodePath;

      expect(printValue(path)).toMatchSnapshot();
    });

    test(`removes trailing ${char} for TsCallSignatureDeclaration`, () => {
      const path = parseTypescript
        .statement<TSInterfaceDeclaration>(`interface A { (): number${char} }`)
        .get('body.body.0') as NodePath;

      expect(printValue(path)).toMatchSnapshot();
    });

    test(`removes trailing ${char} for TsPropertySignature`, () => {
      const path = parseTypescript
        .statement<TSInterfaceDeclaration>(`interface A { x: number${char} }`)
        .get('body.body.0') as NodePath;

      expect(printValue(path)).toMatchSnapshot();
    });

    test(`removes trailing ${char} for TsMethodSignature`, () => {
      const path = parseTypescript
        .statement<TSInterfaceDeclaration>(`interface A { x(): number${char} }`)
        .get('body.body.0') as NodePath;

      expect(printValue(path)).toMatchSnapshot();
    });
  });
});
