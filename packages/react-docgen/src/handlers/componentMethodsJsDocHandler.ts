import parseJsDoc from '../utils/parseJsDoc.js';
import type {
  default as Documentation,
  MethodDescriptor,
} from '../Documentation.js';
import type { Handler } from './index.js';

function removeEmpty<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null),
  ) as T;
}

// Merges two objects ignoring null/undefined.
function merge<
  T extends object | null | undefined,
  U extends object | null | undefined,
>(obj1: T, obj2: U): (T & U) | null {
  if (obj1 == null && obj2 == null) {
    return null;
  }
  const merged = {
    ...removeEmpty(obj1 ?? {}),
    ...removeEmpty(obj2 ?? {}),
  };

  return merged as T & U;
}
/**
 * Extract info from the methods jsdoc blocks. Must be run after
 * flowComponentMethodsHandler.
 */
const componentMethodsJsDocHandler: Handler = function (
  documentation: Documentation,
): void {
  let methods = documentation.get<MethodDescriptor[]>('methods');

  if (!methods) {
    return;
  }

  // @ts-ignore
  methods = methods.map((method) => {
    if (!method.docblock) {
      return method;
    }

    const jsDoc = parseJsDoc(method.docblock);

    const returns = merge(jsDoc.returns, method.returns);
    const params = method.params.map((param) => {
      const jsDocParam = jsDoc.params.find((p) => p.name === param.name);

      return merge(jsDocParam, param);
    });

    return {
      ...method,
      description: jsDoc.description || null,
      returns,
      params,
    };
  });

  documentation.set('methods', methods);
};

export default componentMethodsJsDocHandler;
