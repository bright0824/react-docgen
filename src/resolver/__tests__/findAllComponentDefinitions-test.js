/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */

/*global jest, describe, beforeEach, it, expect*/

jest.autoMockOff();

describe('findAllComponentDefinitions', () => {
  var findAllComponentDefinitions;
  var recast;
  var utils;

  function parse(source) {
    return findAllComponentDefinitions(
      utils.parse(source),
      recast
    );
  }

  beforeEach(() => {
    findAllComponentDefinitions = require('../findAllComponentDefinitions');
    utils = require('../../../tests/utils');
    recast = require('recast');
  });

  describe('React.createClass', () => {

    it('finds React.createClass', () => {
      var source = `
        var React = require("React");
        var Component = React.createClass({});
        module.exports = Component;
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0] instanceof recast.types.NodePath).toBe(true);
      expect(result[0].node.type).toBe('ObjectExpression');
    });

    it('finds React.createClass, independent of the var name', () => {
      var source = `
        var R = require("React");
        var Component = R.createClass({});
        module.exports = Component;
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('does not process X.createClass of other modules', () => {
      var source = `
        var R = require("NoReact");
        var Component = R.createClass({});
        module.exports = Component;
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('finds assignments to exports', () => {
      var source = `
        var R = require("React");
        var Component = R.createClass({});
        exports.foo = 42;
        exports.Component = Component;
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('accepts multiple definitions', () => {
      var source = `
        var R = require("React");
        var ComponentA = R.createClass({});
        var ComponentB = R.createClass({});
        exports.ComponentB = ComponentB;
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      source = `
        var R = require("React");
        var ComponentA = R.createClass({});
        var ComponentB = R.createClass({});
        module.exports = ComponentB;
      `;

      result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

  });

  describe('class definitions', () => {

    it('finds component classes', () => {
      var source = `
        import React from 'React';
        class ComponentA extends React.Component {}
        class ComponentB { render() {} }
        var ComponentC = class extends React.Component {}
        var ComponentD = class { render() {} }
        class NotAComponent {}
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
    });

    it('finds React.createClass, independent of the var name', () => {
      var source = `
        import R from 'React';
        class Component extends R.Component {};
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('does not process X.createClass of other modules', () => {
      var source = `
        import R from 'FakeReact';
        class Component extends R.Component {};
      `;

      var result = parse(source);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

});
