import type { NodePath } from '@babel/traverse';
import type { ObjectExpression } from '@babel/types';
import { parse, makeMockImporter } from '../../../tests/utils';
import Documentation from '../../Documentation';
import type DocumentationMock from '../../__mocks__/Documentation';
import defaultPropsHandler from '../defaultPropsHandler';

jest.mock('../../Documentation');

describe('defaultPropsHandler', () => {
  let documentation: Documentation & DocumentationMock;
  beforeEach(() => {
    documentation = new Documentation() as Documentation & DocumentationMock;
  });

  const mockImporter = makeMockImporter({
    getDefaultProps: stmtLast =>
      stmtLast(`
      import baz from 'baz';
      export default function() {
        return {
          foo: "bar",
          bar: 42,
          baz: baz,
          abc: {xyz: abc.def, 123: 42}
        };
      }
    `).get('declaration'),

    baz: stmtLast =>
      stmtLast(`
      export default ["foo", "bar"];
    `).get('declaration'),

    other: stmtLast =>
      stmtLast(`
      export default { bar: "foo" };
    `).get('declaration'),

    defaultProps: stmtLast =>
      stmtLast(`
      export default {
        foo: "bar",
        bar: 42,
        baz: ["foo", "bar"],
        abc: {xyz: abc.def, 123: 42}
      };
    `).get('declaration'),
  });

  describe('ObjectExpression', () => {
    it('should find prop default values that are literals', () => {
      const src = `
        {
          getDefaultProps: function() {
            return {
              foo: "bar",
              bar: 42,
              falseliteral: false,
              trueliteral: true,
              nullliteral: null,
              regex: /./,
              bigint: 1n,
              baz: ["foo", "bar"],
              abc: {xyz: abc.def, 123: 42}
            };
          }
        }
      `;
      defaultPropsHandler(
        documentation,
        parse.expression<ObjectExpression>(src),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('can resolve object methods', () => {
      const src = `
        {
          getDefaultProps() {
            return {
              foo: "bar",
            };
          }
        }
      `;
      defaultPropsHandler(
        documentation,
        parse.expression<ObjectExpression>(src),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('can resolve declared functions', () => {
      const src = `
        function getDefaultProps() {
          return {
            foo: "bar",
            bar: 42,
            baz: ["foo", "bar"],
            abc: {xyz: abc.def, 123: 42}
          };
        }
        ({
          getDefaultProps: getDefaultProps
        })
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should find prop default values that are literals from imported functions', () => {
      const src = `
        import getDefaultProps from 'getDefaultProps';

        ({
          getDefaultProps: getDefaultProps
        })
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('handles computed properties', () => {
      const src = `
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              [bar]: 42,
            };
          }
        })
      `;
      defaultPropsHandler(
        documentation,
        parse(src).get('body.0.expression') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('handles imported values assigned to computed properties', () => {
      const src = `
        import baz from 'baz';
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              [bar]: baz,
            };
          }
        })
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('ignores complex computed properties', () => {
      const src = `
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              [() => {}]: 42,
            };
          }
        })
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('ignores imported values assigned to complex computed properties', () => {
      const src = `
        import baz from 'baz';
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              [() => {}]: baz,
            };
          }
        })
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves local spreads', () => {
      const src = `
        const other = { bar: "foo" };

        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              ...other,
            };
          }
        })
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported spreads', () => {
      const src = `
        import other from 'other';
        ({
          getDefaultProps: function() {
            return {
              foo: "bar",
              ...other,
            };
          }
        })
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });
  });

  describe('ClassDeclaration with static defaultProps', () => {
    it('should find prop default values that are literals', () => {
      const src = `
        class Foo {
          static defaultProps = {
            foo: "bar",
            bar: 42,
            baz: ["foo", "bar"],
            abc: {xyz: abc.def, 123: 42}
          };
        }
      `;
      defaultPropsHandler(documentation, parse(src).get('body')[0]);
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should find prop default values that are literals', () => {
      const src = `
        class Foo {
          static get defaultProps() {
            return {
              foo: "bar",
            };
          }
        }
      `;
      defaultPropsHandler(documentation, parse(src).get('body')[0]);
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported values assigned as default props', () => {
      const src = `
        import defaultProps from 'defaultProps';
        class Foo {
          static defaultProps = defaultProps;
        }
      `;
      defaultPropsHandler(
        documentation,
        parse.statementLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should resolve local spreads', () => {
      const src = `
        const other = { bar: "foo" };

        class Foo {
          static defaultProps = {
            foo: "bar",
            ...other
          };
        }
      `;
      defaultPropsHandler(documentation, parse.statementLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported spreads', () => {
      const src = `
        import other from 'other';
        class Foo {
          static defaultProps = {
            foo: "bar",
            ...other
          };
        }
      `;
      defaultPropsHandler(
        documentation,
        parse.statementLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should find prop default values that are imported variables', () => {
      const src = `
        import ImportedComponent from './ImportedComponent';

        class Foo {
          static defaultProps = {
            foo: ImportedComponent,
          };
        }
      `;
      defaultPropsHandler(documentation, parse.statementLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('can resolve default props that are imported given a custom importer', () => {
      const src = `
        import baz from 'baz';

        class Foo {
          static defaultProps = {
            baz: baz,
          };
        }
      `;
      defaultPropsHandler(
        documentation,
        parse.statementLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });
  });

  describe('ClassExpression with static defaultProps', () => {
    it('should find prop default values that are literals', () => {
      const src = `
        var Bar = class {
          static defaultProps = {
            foo: "bar",
            bar: 42,
            baz: ["foo", "bar"],
            abc: {xyz: abc.def, 123: 42}
          };
      }`;
      defaultPropsHandler(
        documentation,
        parse.statement(src).get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported values assigned as default props', () => {
      const src = `
        import defaultProps from 'defaultProps';
        var Bar = class {
          static defaultProps = defaultProps;
        }
      `;
      defaultPropsHandler(
        documentation,
        parse
          .statementLast(src, mockImporter)
          .get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });
  });

  it('should only consider Property nodes, not e.g. spread properties', () => {
    const src = `
      {
        getDefaultProps: function() {
          return {
            ...Foo.bar,
            bar: 42,
          };
        }
      }
    `;
    const definition = parse.expression(src);
    expect(() => defaultPropsHandler(documentation, definition)).not.toThrow();
    expect(documentation.descriptors).toMatchSnapshot();
  });

  it('can have an importer that resolves spread properties', () => {
    const src = `
      import Props from 'defaultProps';
      ({
        getDefaultProps: function() {
          return {
            ...Props.abc,
            bar: 42,
          };
        }
      })
    `;
    const definition = parse.expressionLast(src, mockImporter);
    expect(() => defaultPropsHandler(documentation, definition)).not.toThrow();
    expect(documentation.descriptors).toMatchSnapshot();
  });

  describe('Functional components with default params', () => {
    it('should find default props that are literals', () => {
      const src = `
        ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc = {xyz: abc.def, 123: 42}
        }) => <div />
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('can use imported values as default props', () => {
      const src = `
        import baz from 'baz';
        ({
          bar = baz,
        }) => <div />
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should override with defaultProps if available', () => {
      const src = `
        var Foo = ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc = 'test'
        }) => <div />
        Foo.defaultProps = { abc: {xyz: abc.def, 123: 42} };
      `;
      defaultPropsHandler(
        documentation,
        parse.statement(src).get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('overrides with imported defaultProps', () => {
      const src = `
        import other from 'other';
        var Foo = ({
          bar = 42,
        }) => <div />
        Foo.defaultProps = other;
      `;
      defaultPropsHandler(
        documentation,
        parse
          .statement(src, mockImporter, 1)
          .get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves local spreads', () => {
      const src = `
        const other = { bar: "foo" };
        var Foo = (props) => <div />
        Foo.defaultProps = { foo: "bar", ...other };
      `;
      defaultPropsHandler(
        documentation,
        parse.statement(src, 1).get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported spreads', () => {
      const src = `
        import other from 'other';
        var Foo = (props) => <div />
        Foo.defaultProps = { foo: "bar", ...other };
      `;
      defaultPropsHandler(
        documentation,
        parse
          .statement(src, mockImporter, 1)
          .get('declarations.0.init') as NodePath,
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should work with aliases', () => {
      const src = `
        ({
          foo = "bar",
          bar = 42,
          baz = ["foo", "bar"],
          abc: defg = {xyz: abc.def, 123: 42}
        }) => <div />
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('allows imported defaults to be aliased', () => {
      const src = `
        import baz from 'baz';
        ({
          foo: bar = baz,
        }) => <div />
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should find prop default values that are imported variables', () => {
      const src = `
        import ImportedComponent from './ImportedComponent';

        ({
          foo = ImportedComponent,
        }) => <div />
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('should work with no defaults', () => {
      const src = `({ foo }) => <div />`;

      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });
  });

  describe('forwardRef', () => {
    it('resolves default props in the parameters', () => {
      const src = `
        import React from 'react';
        React.forwardRef(({ foo = 'bar' }, ref) => <div ref={ref}>{foo}</div>);
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported default props in the parameters', () => {
      const src = `
        import baz from 'baz';
        import React from 'react';
        React.forwardRef(({ bar = baz }, ref) => <div ref={ref}>{bar}</div>);
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves defaultProps', () => {
      const src = `
        import React from 'react';
        const Component = React.forwardRef(({ foo }, ref) => <div ref={ref}>{foo}</div>);
        Component.defaultProps = { foo: 'baz' };
      `;
      defaultPropsHandler(documentation, parse.statement(src, 1));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves imported defaultProps', () => {
      const src = `
        import other from 'other';
        import React from 'react';
        const Component = React.forwardRef(({ bar }, ref) => <div ref={ref}>{bar}</div>);
        Component.defaultProps = other;
      `;
      defaultPropsHandler(documentation, parse.statement(src, mockImporter, 2));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('resolves when the function is not inline', () => {
      const src = `
        import React from 'react';
        const ComponentImpl = ({ foo = 'bar' }, ref) => <div ref={ref}>{foo}</div>;
        React.forwardRef(ComponentImpl);
      `;
      defaultPropsHandler(documentation, parse.expressionLast(src));
      expect(documentation.descriptors).toMatchSnapshot();
    });

    it('also resolves imports when the function is not inline', () => {
      const src = `
        import baz from 'baz';
        import React from 'react';
        const ComponentImpl = ({ bar = baz }, ref) => <div ref={ref}>{bar}</div>;
        React.forwardRef(ComponentImpl);
      `;
      defaultPropsHandler(
        documentation,
        parse.expressionLast(src, mockImporter),
      );
      expect(documentation.descriptors).toMatchSnapshot();
    });
  });
});
