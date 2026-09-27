/**
 * Sucrase's parser, which the package does not export by name but ships as plain modules. The
 * types are the package's own, from beside them.
 */
declare module 'sucrase/dist/esm/parser/index.js' {
  import type { Token } from 'sucrase/dist/types/parser/tokenizer/index';
  export function parse(
    input: string,
    isJSXEnabled: boolean,
    isTypeScriptEnabled: boolean,
    isFlowEnabled: boolean,
  ): { tokens: Token[] };
}

declare module 'sucrase/dist/esm/parser/tokenizer/types.js' {
  export { TokenType } from 'sucrase/dist/types/parser/tokenizer/types';
}

declare module 'sucrase/dist/esm/parser/tokenizer/index.js' {
  export { IdentifierRole } from 'sucrase/dist/types/parser/tokenizer/index';
}
