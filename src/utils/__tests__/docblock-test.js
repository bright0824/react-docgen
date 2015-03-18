/*
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */

"use strict";

jest.autoMockOff();

describe('docblock', () => {

  describe('getDoclets', () => {
    var getDoclets;

    beforeEach(() => {
      getDoclets = require('../docblock').getDoclets;
    });

    it('extracts single line doclets', () => {
      expect(getDoclets('@foo bar\n@bar baz'))
        .toEqual({foo: 'bar', bar: 'baz'});
    });

    it('extracts multi line doclets', () => {
      expect(getDoclets('@foo bar\nbaz\n@bar baz'))
        .toEqual({foo: 'bar\nbaz', bar: 'baz'});
    });

    it('extracts boolean doclets', () => {
      expect(getDoclets('@foo bar\nbaz\n@abc\n@bar baz'))
        .toEqual({foo: 'bar\nbaz', abc: true, bar: 'baz'});
    });
  });

});
