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


jest.disableAutomock();

describe('isReactCreateClassCall', () => {
  var isReactCreateClassCall;
  var utils;

  function parse(src) {
    var root = utils.parse(src);
    return root.get('body', root.node.body.length - 1, 'expression');
  }

  beforeEach(() => {
    isReactCreateClassCall = require('../isReactCreateClassCall').default;
    utils = require('../../../tests/utils');
  });

  describe('built in React.createClass', () => {
    it('accepts createClass called on React', () => {
      var def = parse(`
        var React = require("React");
        React.createClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(true);
    });

    it('accepts createClass called on aliased React', () => {
      var def = parse(`
        var other = require("React");
        other.createClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(true);
    });

    it('ignores other React calls', () => {
      var def = parse(`
        var React = require("React");
        React.isValidElement({});
      `);
      expect(isReactCreateClassCall(def)).toBe(false);
    });

    it('ignores non React calls to createClass', () => {
      var def = parse(`
        var React = require("bob");
        React.createClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(false);
    });
  });

  describe('modular in create-react-class', () => {
    it('accepts create-react-class', () => {
      var def = parse(`
        var createReactClass = require("create-react-class");
        createReactClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(true);
    });

    it('accepts create-react-class calls on another name', () => {
      var def = parse(`
        var makeClass = require("create-react-class");
        makeClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(true);
    });

    it('ignores non create-react-class calls to createReactClass', () => {
      var def = parse(`
        var createReactClass = require("bob");
        createReactClass({
          render() {}
        });
      `);
      expect(isReactCreateClassCall(def)).toBe(false);
    });
  });
});
