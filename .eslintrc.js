module.exports = {
  parser: 'babel-eslint',
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins:[
    'prettier'
  ],
  rules: {
    strict: ['error', 'never'],
    'no-shadow': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prettier/prettier': 'error',
  },
  env: {
    node: true,
    es6: true
  },
  globals: {
    ASTNode: true,
    FlowTypeDescriptor: true,
    Handler: true,
    NodePath: true,
    PropDescriptor: true,
    PropTypeDescriptor: true,
    Resolver: true
  }
}
