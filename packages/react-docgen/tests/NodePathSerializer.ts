import { NodePath } from '@babel/traverse';
import { removePropertiesDeep } from '@babel/types';
import type { expect } from 'vitest';

function removeUndefinedProperties(node) {
  for (const key of Object.keys(node)) {
    if (node[key] === undefined) {
      delete node[key];
    } else if (node[key] === Object(node[key])) {
      node[key] = removeUndefinedProperties(node[key]);
    }
  }

  return node;
}

export default {
  serialize(val, config, indentation, depth, refs, printer) {
    return printer(
      removeUndefinedProperties(removePropertiesDeep(val.node)),
      config,
      indentation,
      depth,
      refs,
    );
  },

  test(val) {
    return val && val instanceof NodePath;
  },
} as Parameters<typeof expect.addSnapshotSerializer>[0];
