/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*global describe, beforeEach, it, expect*/

describe('normalizeClassDefinition', () => {
  let parse;
  let normalizeClassDefinition;

  beforeEach(() => {
    ({ parse } = require('../../../tests/utils'));
    normalizeClassDefinition = require('../normalizeClassDefinition').default;
  });

  it('finds assignments to class declarations', () => {
    const classDefinition = parse(`
      class Foo {}
      Foo.propTypes = 42;
    `).get('body', 0);

    normalizeClassDefinition(classDefinition);
    const {
      node: {
        body: {
          body: [classProperty],
        },
      },
    } = classDefinition;
    expect(classProperty).toBeDefined();
    expect(classProperty.key.name).toBe('propTypes');
    expect(classProperty.value.value).toBe(42);
    expect(classProperty.static).toBe(true);
  });

  it('should not fail on classes without ids', () => {
    const classDefinition = parse(`
      export default class extends React.Component {
        static propTypes = 42;
      }
    `).get('body', 0, 'declaration');

    normalizeClassDefinition(classDefinition);
    const {
      node: {
        body: {
          body: [classProperty],
        },
      },
    } = classDefinition;
    expect(classProperty).toBeDefined();
    expect(classProperty.key.name).toBe('propTypes');
    expect(classProperty.value.value).toBe(42);
    expect(classProperty.static).toBe(true);
  });

  it('finds assignments to class expressions', () => {
    let classDefinition = parse(`
      var Foo = class {};
      Foo.propTypes = 42;
    `).get('body', 0, 'declarations', 0, 'init');

    normalizeClassDefinition(classDefinition);
    let {
      node: {
        body: {
          body: [classProperty],
        },
      },
    } = classDefinition;
    expect(classProperty).toBeDefined();
    expect(classProperty.key.name).toBe('propTypes');
    expect(classProperty.value.value).toBe(42);
    expect(classProperty.static).toBe(true);

    classDefinition = parse(`
      var Foo;
      Foo = class {};
      Foo.propTypes = 42;
    `).get('body', 1, 'expression', 'right');

    normalizeClassDefinition(classDefinition);
    ({
      node: {
        body: {
          body: [classProperty],
        },
      },
    } = classDefinition);
    expect(classProperty).toBeDefined();
  });

  it('ignores assignments further up the tree', () => {
    const classDefinition = parse(`
      var Foo = function() {
        (class {});
      };
      Foo.bar = 42;
    `).get(
      'body',
      0,
      'declarations',
      0,
      'init',
      'body',
      'body',
      '0',
      'expression',
    );

    normalizeClassDefinition(classDefinition);
    const {
      node: {
        body: {
          body: [classProperty],
        },
      },
    } = classDefinition;
    expect(classProperty).not.toBeDefined();
  });
});
