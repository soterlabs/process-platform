declare module "acorn" {
  export interface Node {
    type: string;
    start?: number;
    end?: number;
    [key: string]: unknown;
  }

  export function parseExpressionAt(
    input: string,
    pos: number,
    options?: { ecmaVersion?: number; ranges?: boolean }
  ): Node;
}
