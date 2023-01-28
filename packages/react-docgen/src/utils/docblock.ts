/**
 * Helper functions to work with docblock comments.
 */

import type { NodePath } from '@babel/traverse';
import type { CommentBlock, CommentLine } from '@babel/types';

const DOCLET_PATTERN = /^@(\w+)(?:$|\s((?:[^](?!^@\w))*))/gim;

function parseDocblock(str: string): string {
  // Does not use \s in the regex as this would match also \n and conflicts
  // with windows line endings.
  return str.replace(/^[ \t]*\*[ \t]?/gm, '').trim();
}

const DOCBLOCK_HEADER = /^\*\s/;

/**
 * Given a path, this function returns the closest preceding docblock if it
 * exists.
 */
export function getDocblock(path: NodePath, trailing = false): string | null {
  let comments: Array<CommentBlock | CommentLine> = [];

  if (trailing && path.node.trailingComments) {
    comments = path.node.trailingComments.filter(
      (comment) =>
        comment.type === 'CommentBlock' && DOCBLOCK_HEADER.test(comment.value),
    );
  } else if (path.node.leadingComments) {
    comments = path.node.leadingComments.filter(
      (comment) =>
        comment.type === 'CommentBlock' && DOCBLOCK_HEADER.test(comment.value),
    );
  }

  if (comments.length > 0) {
    return parseDocblock(comments[comments.length - 1].value);
  }

  return null;
}

/**
 * Given a string, this functions returns an object with doclet names as keys
 * and their "content" as values.
 */
export function getDoclets(str: string): Record<string, string> {
  const doclets = Object.create(null);
  let match: RegExpExecArray | null;

  while ((match = DOCLET_PATTERN.exec(str))) {
    doclets[match[1]] = match[2] || true;
  }

  return doclets;
}
