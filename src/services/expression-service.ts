/**
 * Service for evaluating expressions against a context.
 * Expressions are JavaScript (e.g. "context.foo.bar", "context.role === 'admin'").
 *
 * Security: we parse the string as an expression, validate the AST to allow only
 * side-effect-free expression nodes (no calls, assignment, new, etc.), then evaluate
 * with `context` and its keys in scope (e.g. context.foo or bare foo).
 */

import * as acorn from "acorn";

type EstreeExpression = acorn.Node & {
  type: string;
  end?: number;
  [key: string]: unknown;
};

/** Node types that are side-effect-free and expression-only (no calls, assignment, new). */
const ALLOWED_NODE_TYPES = new Set([
  "Literal",
  "Identifier",
  "MemberExpression",
  "BinaryExpression",
  "UnaryExpression",
  "LogicalExpression",
  "ConditionalExpression",
  "ArrayExpression",
  "ObjectExpression",
  "Property",
  "TemplateLiteral",
  "TemplateElement",
  "ChainExpression",
  "ParenthesizedExpression",
]);

function walkAndValidate(node: EstreeExpression): void {
  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    throw new Error(`Disallowed expression node: ${node.type}`);
  }
  switch (node.type) {
    case "ChainExpression":
      if (
        (node as EstreeExpression & { expression: EstreeExpression }).expression
          .type === "CallExpression"
      ) {
        throw new Error("Optional chaining on calls is not allowed");
      }
      walkAndValidate(
        (node as EstreeExpression & { expression: EstreeExpression }).expression
      );
      break;
    case "MemberExpression": {
      const mem = node as EstreeExpression & {
        object: EstreeExpression;
        property: EstreeExpression;
      };
      walkAndValidate(mem.object);
      walkAndValidate(mem.property);
      break;
    }
    case "BinaryExpression":
    case "LogicalExpression":
    case "ConditionalExpression": {
      const n = node as Record<string, EstreeExpression>;
      walkAndValidate(n.left);
      if (n.right) walkAndValidate(n.right);
      if (n.consequent) walkAndValidate(n.consequent);
      if (n.alternate) walkAndValidate(n.alternate);
      break;
    }
    case "UnaryExpression":
      walkAndValidate(
        (node as EstreeExpression & { argument: EstreeExpression }).argument
      );
      break;
    case "ArrayExpression": {
      const elts = (node as EstreeExpression & { elements: (EstreeExpression | null)[] })
        .elements;
      for (const el of elts) {
        if (el) walkAndValidate(el);
      }
      break;
    }
    case "ObjectExpression": {
      const props = (node as EstreeExpression & { properties: EstreeExpression[] })
        .properties;
      for (const p of props) {
        if (p.type === "SpreadElement")
          throw new Error("Spread in object literal is not allowed");
        walkAndValidate(p);
      }
      break;
    }
    case "Property": {
      const p = node as EstreeExpression & {
        key: EstreeExpression;
        value: EstreeExpression;
      };
      walkAndValidate(p.key);
      walkAndValidate(p.value);
      break;
    }
    case "TemplateLiteral": {
      const t = node as EstreeExpression & {
        expressions: EstreeExpression[];
      };
      for (const e of t.expressions) walkAndValidate(e);
      break;
    }
    case "ParenthesizedExpression":
      walkAndValidate(
        (node as EstreeExpression & { expression: EstreeExpression }).expression
      );
      break;
    default:
      break;
  }
}

function safeEval(
  node: EstreeExpression,
  context: Record<string, unknown>
): unknown {
  switch (node.type) {
    case "Literal":
      return (node as EstreeExpression & { value: unknown }).value;
    case "Identifier": {
      const name = (node as EstreeExpression & { name: string }).name;
      if (name === "context") return context;
      if (Object.prototype.hasOwnProperty.call(context, name))
        return context[name];
      throw new Error(`Only "context" is in scope, got: ${name}`);
    }
    case "MemberExpression": {
      const m = node as EstreeExpression & {
        object: EstreeExpression;
        property: EstreeExpression;
        computed: boolean;
        optional?: boolean;
      };
      const obj = safeEval(m.object, context);
      if (m.optional && (obj == null)) return undefined;
      if (obj == null)
        throw new TypeError("Cannot read property of null or undefined");
      const key = m.computed
        ? safeEval(m.property, context)
        : (m.property as EstreeExpression & { name: string }).name;
      return (obj as Record<string, unknown>)[String(key)];
    }
    case "ChainExpression":
      try {
        return safeEval(
          (node as EstreeExpression & { expression: EstreeExpression })
            .expression,
          context
        );
      } catch {
        return undefined;
      }
    case "BinaryExpression": {
      const b = node as EstreeExpression & {
        left: EstreeExpression;
        right: EstreeExpression;
        operator: string;
      };
      const l = safeEval(b.left, context);
      const r = safeEval(b.right, context);
      switch (b.operator) {
        case "==":
          return l == r;
        case "===":
          return l === r;
        case "!=":
          return l != r;
        case "!==":
          return l !== r;
        case "<":
          return (l as number) < (r as number);
        case "<=":
          return (l as number) <= (r as number);
        case ">":
          return (l as number) > (r as number);
        case ">=":
          return (l as number) >= (r as number);
        case "+":
          return (l as number) + (r as number);
        case "-":
          return (l as number) - (r as number);
        case "*":
          return (l as number) * (r as number);
        case "/":
          return (l as number) / (r as number);
        case "%":
          return (l as number) % (r as number);
        case "**":
          return (l as number) ** (r as number);
        case "in":
          return (r as object) !== null && (l as string) in (r as object);
        case "instanceof":
          return (l as object) instanceof (r as new () => object);
        default:
          throw new Error(`Unsupported operator: ${b.operator}`);
      }
    }
    case "UnaryExpression": {
      const u = node as EstreeExpression & {
        argument: EstreeExpression;
        operator: string;
      };
      const a = safeEval(u.argument, context);
      switch (u.operator) {
        case "!":
          return !a;
        case "-":
          return -(a as number);
        case "+":
          return +(a as number);
        case "typeof":
          return typeof a;
        case "void":
          return undefined;
        default:
          throw new Error(`Unsupported unary operator: ${u.operator}`);
      }
    }
    case "LogicalExpression": {
      const lg = node as EstreeExpression & {
        left: EstreeExpression;
        right: EstreeExpression;
        operator: string;
      };
      const lv = safeEval(lg.left, context);
      if (lg.operator === "&&" && !lv) return lv;
      if (lg.operator === "||" && lv) return lv;
      if (lg.operator === "??" && lv != null) return lv;
      return safeEval(lg.right, context);
    }
    case "ConditionalExpression": {
      const c = node as EstreeExpression & {
        test: EstreeExpression;
        consequent: EstreeExpression;
        alternate: EstreeExpression;
      };
      return safeEval(c.test, context)
        ? safeEval(c.consequent, context)
        : safeEval(c.alternate, context);
    }
    case "ArrayExpression": {
      const elts = (node as EstreeExpression & { elements: EstreeExpression[] })
        .elements;
      return elts.map((el: EstreeExpression | null) =>
        el ? safeEval(el, context) : undefined
      );
    }
    case "ObjectExpression": {
      const props = (node as EstreeExpression & { properties: EstreeExpression[] })
        .properties;
      const out: Record<string, unknown> = {};
      for (const p of props) {
        if (p.type !== "Property") continue;
        const prop = p as EstreeExpression & {
          key: EstreeExpression & { name?: string };
          value: EstreeExpression;
          computed?: boolean;
        };
        const key = prop.computed
          ? safeEval(prop.key, context)
          : (prop.key as EstreeExpression & { name: string }).name;
        out[String(key)] = safeEval(prop.value, context);
      }
      return out;
    }
    case "TemplateLiteral": {
      const t = node as EstreeExpression & {
        quasis: Array<EstreeExpression & { value: { cooked: string } }>;
        expressions: EstreeExpression[];
      };
      let s = t.quasis[0].value.cooked;
      for (let i = 0; i < t.expressions.length; i++) {
        s += String(safeEval(t.expressions[i], context));
        s += t.quasis[i + 1].value.cooked;
      }
      return s;
    }
    case "ParenthesizedExpression":
      return safeEval(
        (node as EstreeExpression & { expression: EstreeExpression }).expression,
        context
      );
    case "TemplateElement":
      return (node as EstreeExpression & { value: { cooked: string } }).value
        .cooked;
    default:
      throw new Error(`Cannot evaluate node type: ${node.type}`);
  }
}

/**
 * Returns whether the expression is valid and safe to evaluate.
 * Checks that it parses as a single expression and passes the AST allow-list (no side effects).
 */
export function isValid(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;

  try {
    const ast = acorn.parseExpressionAt(trimmed, 0, {
      ecmaVersion: 2020,
      ranges: true,
    }) as EstreeExpression;

    if (ast.end !== trimmed.length) {
      return false;
    }

    walkAndValidate(ast);
    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluates an expression against the given context.
 * Only side-effect-free expressions are allowed. In scope: "context" and any key of context (e.g. context.foo or just foo).
 */
export function evaluate(
  context: Record<string, unknown>,
  expression: string
): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return undefined;

  try {
    const ast = acorn.parseExpressionAt(trimmed, 0, {
      ecmaVersion: 2020,
      ranges: true,
    }) as EstreeExpression;

    if (ast.end !== trimmed.length) {
      throw new Error("Expression must be a single expression (no trailing code)");
    }

    walkAndValidate(ast);
    return safeEval(ast, context);
  } catch (err) {
    console.error("[expression-service] evaluate failed", {
      expression: trimmed,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return undefined;
  }
}
