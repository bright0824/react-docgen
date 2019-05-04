/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

jest.mock('../../Documentation');

import { expression, statement } from '../../../tests/utils';

describe('propTypeCompositionHandler', () => {
  let getPropTypeMock;
  let documentation;
  let propTypeCompositionHandler;

  beforeEach(() => {
    getPropTypeMock = jest.fn(() => ({}));
    jest.setMock('../../utils/getPropType', getPropTypeMock);
    jest.mock('../../utils/getPropType');

    documentation = new (require('../../Documentation'))();
    propTypeCompositionHandler = require('../propTypeCompositionHandler')
      .default;
  });

  function test(getSrc, parse) {
    it('understands assignment from module', () => {
      let definition = parse(`
        ${getSrc('Foo.propTypes')}
        var Foo = require("Foo.react");
      `);

      propTypeCompositionHandler(documentation, definition);
      expect(documentation.composes).toEqual(['Foo.react']);

      documentation = new (require('../../Documentation'))();
      definition = parse(`
        ${getSrc('SharedProps')}
        var SharedProps = require("SharedProps");
      `);

      propTypeCompositionHandler(documentation, definition);
      expect(documentation.composes).toEqual(['SharedProps']);
    });

    it('understands the spread operator', () => {
      const definitionSrc = getSrc(
        `{
          ...Foo.propTypes,
          ...SharedProps,
        }`,
      );
      const definition = parse(`
        ${definitionSrc}
        var Foo = require("Foo.react");
        var SharedProps = require("SharedProps");
      `);

      propTypeCompositionHandler(documentation, definition);
      expect(documentation.composes).toEqual(['Foo.react', 'SharedProps']);
    });
  }

  describe('React.createClass', () => {
    test(
      propTypesSrc => `({propTypes: ${propTypesSrc}})`,
      src => statement(src).get('expression'),
    );
  });

  describe('class definition', () => {
    describe('class properties', () => {
      test(
        propTypesSrc => `
          class Component {
            static propTypes = ${propTypesSrc};
          }
        `,
        src => statement(src),
      );
    });

    describe('static getter', () => {
      test(
        propTypesSrc => `
          class Component {
            static get propTypes() {
              return ${propTypesSrc};
            }
          }
        `,
        src => statement(src),
      );
    });
  });

  it('does not error if propTypes cannot be found', () => {
    let definition = expression('{fooBar: 42}');
    expect(() =>
      propTypeCompositionHandler(documentation, definition),
    ).not.toThrow();

    definition = statement('class Foo {}');
    expect(() =>
      propTypeCompositionHandler(documentation, definition),
    ).not.toThrow();
  });
});
