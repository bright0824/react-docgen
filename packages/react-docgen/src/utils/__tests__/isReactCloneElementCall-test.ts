import { parse, makeMockImporter } from '../../../tests/utils';
import isReactCloneElementCall from '../isReactCloneElementCall.js';
import { describe, expect, test } from 'vitest';

describe('isReactCloneElementCall', () => {
  const mockImporter = makeMockImporter({
    foo: (stmtLast) =>
      stmtLast(`
      import React from 'react';
      export default React.cloneElement;
    `).get('declaration'),
  });

  describe('built in React.createClass', () => {
    test('accepts cloneElement called on React', () => {
      const def = parse.expressionLast(`
        var React = require("React");
        React.cloneElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('accepts cloneElement called on aliased React', () => {
      const def = parse.expressionLast(`
        var other = require("React");
        other.cloneElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('ignores other React calls', () => {
      const def = parse.expressionLast(`
        var React = require("React");
        React.isValidElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(false);
    });

    test('ignores non React calls to cloneElement', () => {
      const def = parse.expressionLast(`
        var React = require("bob");
        React.cloneElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(false);
    });

    test('accepts cloneElement called on destructed value', () => {
      const def = parse.expressionLast(`
        var { cloneElement } = require("react");
        cloneElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('accepts cloneElement called on destructed aliased value', () => {
      const def = parse.expressionLast(`
        var { cloneElement: foo } = require("react");
        foo({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('accepts cloneElement called on imported value', () => {
      const def = parse.expressionLast(`
        import { cloneElement } from "react";
        cloneElement({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('accepts cloneElement called on imported aliased value', () => {
      const def = parse.expressionLast(`
        import { cloneElement as foo } from "react";
        foo({});
      `);

      expect(isReactCloneElementCall(def)).toBe(true);
    });

    test('can resolve cloneElement imported from an intermediate module', () => {
      const def = parse.expressionLast(
        `
        import foo from "foo";
        foo({});
      `,
        mockImporter,
      );

      expect(isReactCloneElementCall(def)).toBe(true);
    });
  });
});
