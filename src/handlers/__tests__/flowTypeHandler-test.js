/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

jest.mock('../../Documentation');

import { expression, statement, parse } from '../../../tests/utils';

describe('flowTypeHandler', () => {
  let getFlowTypeMock;
  let documentation;
  let flowTypeHandler;

  beforeEach(() => {
    getFlowTypeMock = jest.fn(() => ({}));
    jest.setMock('../../utils/getFlowType', getFlowTypeMock);
    jest.mock('../../utils/getFlowType');

    documentation = new (require('../../Documentation'))();
    flowTypeHandler = require('../flowTypeHandler').default;
  });

  function template(src, typeObject) {
    return `
      ${src}
      var React = require('React');
      var Component = React.Component;

      type Props = ${typeObject};
    `;
  }

  function test(getSrc) {
    it('detects types correctly', () => {
      const flowTypesSrc = `
      {
        foo: string,
        bar: number,
        hal: boolean,
      }
      `;
      const definition = getSrc(flowTypesSrc);

      flowTypeHandler(documentation, definition);

      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
        bar: {
          flowType: {},
          required: true,
          description: '',
        },
        hal: {
          flowType: {},
          required: true,
          description: '',
        },
      });
    });

    it('detects whether a prop is required', () => {
      const flowTypesSrc = `
      {
        foo: string,
        bar?: number,
      }
      `;
      const definition = getSrc(flowTypesSrc);

      flowTypeHandler(documentation, definition);

      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
        bar: {
          flowType: {},
          required: false,
          description: '',
        },
      });
    });

    it('ignores hash map entry', () => {
      const flowTypesSrc = `
      {
        [key: string]: string,
        bar?: number,
      }
      `;
      const definition = getSrc(flowTypesSrc);

      flowTypeHandler(documentation, definition);

      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('detects union types', () => {
      const flowTypesSrc = `
      {
        foo: string | number,
        bar: "test" | 1 | true,
      }
      `;
      const definition = getSrc(flowTypesSrc);

      flowTypeHandler(documentation, definition);

      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
        bar: {
          flowType: {},
          required: true,
          description: '',
        },
      });
    });

    it('detects intersection types', () => {
      const flowTypesSrc = `
      {
        foo: Foo & Bar,
      }
      `;
      const definition = getSrc(flowTypesSrc);

      flowTypeHandler(documentation, definition);

      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
      });
    });

    describe('special generic type annotations', () => {
      ['$ReadOnly', '$Exact'].forEach(annotation => {
        it(`unwraps ${annotation}<...>`, () => {
          const flowTypesSrc = `
            ${annotation}<{
              foo: string | number,
            }>
          `;

          const definition = getSrc(flowTypesSrc);

          flowTypeHandler(documentation, definition);

          expect(documentation.descriptors).toEqual({
            foo: {
              flowType: {},
              required: true,
              description: '',
            },
          });
        });
      });
    });
  }

  describe('TypeAlias', () => {
    describe('class definition for flow <0.53', () => {
      test(propTypesSrc =>
        statement(
          template(
            'class Foo extends Component<void, Props, void> {}',
            propTypesSrc,
          ),
        ),
      );
    });

    describe('class definition for flow >=0.53 without State', () => {
      test(propTypesSrc =>
        statement(
          template('class Foo extends Component<Props> {}', propTypesSrc),
        ),
      );
    });

    describe('class definition for flow >=0.53 with State', () => {
      test(propTypesSrc =>
        statement(
          template(
            'class Foo extends Component<Props, State> {}',
            propTypesSrc,
          ),
        ),
      );
    });

    describe('class definition with inline props', () => {
      test(propTypesSrc =>
        statement(
          template(
            'class Foo extends Component { props: Props; }',
            propTypesSrc,
          ),
        ),
      );
    });

    describe('stateless component', () => {
      test(propTypesSrc =>
        statement(template('(props: Props) => <div />;', propTypesSrc)).get(
          'expression',
        ),
      );
    });
  });

  it('does not error if flowTypes cannot be found', () => {
    let definition = expression('{fooBar: 42}');
    expect(() => flowTypeHandler(documentation, definition)).not.toThrow();

    definition = statement('class Foo extends Component {}');
    expect(() => flowTypeHandler(documentation, definition)).not.toThrow();

    definition = statement('() => <div />');
    expect(() => flowTypeHandler(documentation, definition)).not.toThrow();
  });

  it('supports intersection proptypes', () => {
    const definition = statement(`
      (props: Props) => <div />;

      var React = require('React');
      import type Imported from 'something';

      type Props = Imported & { foo: 'bar' };
    `).get('expression');

    flowTypeHandler(documentation, definition);

    expect(documentation.descriptors).toEqual({
      foo: {
        flowType: {},
        required: true,
        description: '',
      },
    });
  });

  it('does support utility types inline', () => {
    const definition = statement(`
      (props: $ReadOnly<Props>) => <div />;

      var React = require('React');

      type Props = { foo: 'fooValue' };
    `).get('expression');

    expect(() => flowTypeHandler(documentation, definition)).not.toThrow();

    expect(documentation.descriptors).toMatchSnapshot();
  });

  it('does not support union proptypes', () => {
    const definition = statement(`
      (props: Props) => <div />;

      var React = require('React');
      import type Imported from 'something';

      type Other = { bar: 'barValue' };
      type Props = Imported | Other | { foo: 'fooValue' };
    `).get('expression');

    expect(() => flowTypeHandler(documentation, definition)).not.toThrow();

    expect(documentation.descriptors).toEqual({});
  });

  describe('does not error for unreachable type', () => {
    function testCode(code) {
      const definition = statement(code).get('expression');

      expect(() => flowTypeHandler(documentation, definition)).not.toThrow();

      expect(documentation.descriptors).toEqual({});
    }

    it('required', () => {
      testCode(`
        (props: Props) => <div />;
        var React = require('React');
        var Component = React.Component;

        var Props = require('something');
      `);
    });

    it('imported', () => {
      testCode(`
        (props: Props) => <div />;
        var React = require('React');
        var Component = React.Component;

        import Props from 'something';
      `);
    });

    it('type imported', () => {
      testCode(`
        (props: Props) => <div />;
        var React = require('React');
        var Component = React.Component;

        import type Props from 'something';
      `);
    });

    it('not in scope', () => {
      testCode(`
        (props: Props) => <div />;
        var React = require('React');
        var Component = React.Component;
      `);
    });
  });

  describe('forwardRef', () => {
    it('resolves prop type from function expression', () => {
      const src = `
        import React from 'react';
        type Props = { foo: string };
        React.forwardRef((props: Props, ref) => <div ref={ref}>{props.foo}</div>);
      `;
      flowTypeHandler(documentation, parse(src).get('body', 2, 'expression'));
      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
      });
    });

    it('resolves when the function is not inline', () => {
      const src = `
        import React from 'react';
        type Props = { foo: string };
        const ComponentImpl = (props: Props, ref) => <div ref={ref}>{props.foo}</div>;
        React.forwardRef(ComponentImpl);
      `;
      flowTypeHandler(documentation, parse(src).get('body', 3, 'expression'));
      expect(documentation.descriptors).toEqual({
        foo: {
          flowType: {},
          required: true,
          description: '',
        },
      });
    });
  });
});
