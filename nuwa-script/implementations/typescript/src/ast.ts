/**
 * Represents the different types of runtime values NuwaScript deals with.
 * This is defined more concretely in values.ts, but needed here for Literal types.
 */
export type NuwaValue =
  | string
  | number
  | boolean
  | null
  | NuwaValue[]
  | { [key: string]: NuwaValue };

// --- Base Nodes ---

export interface BaseNode {
  // Optional: Add location info (start/end line/column) from parser later
  // location?: { start: Position, end: Position };
}

// --- Expressions ---

export type Expression =
  | LiteralExpr
  | VariableExpr
  | BinaryOpExpr
  | UnaryOpExpr
  | FunctionCallExpr
  | ToolCallExpr;
  // | CalcExpr; // Removed CALC

export interface LiteralExpr extends BaseNode {
  kind: 'LiteralExpr';
  value: NuwaValue;
}

export interface VariableExpr extends BaseNode {
  kind: 'VariableExpr';
  name: string; // Can be simple "x" or dotted "obj.prop"
}

export type BinaryOperator =
  | '==' | '!=' | '>' | '<' | '>=' | '<='
  | 'AND' | 'OR'
  | '+' | '-' | '*' | '/'; // Add arithmetic

export interface BinaryOpExpr extends BaseNode {
  kind: 'BinaryOpExpr';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type UnaryOperator = 'NOT' | '+' | '-'; // Add PLUS and MINUS

export interface UnaryOpExpr extends BaseNode {
  kind: 'UnaryOpExpr';
  operator: UnaryOperator;
  operand: Expression;
}

export type BuiltinFunctionName = 'NOW';

export interface FunctionCallExpr extends BaseNode {
  kind: 'FunctionCallExpr';
  functionName: BuiltinFunctionName;
  // arguments: Expression[]; // NOW() has no args, PRINT is a statement
}

// Represents CALL tool { ... } used as an expression
export interface ToolCallExpr extends BaseNode {
  kind: 'ToolCallExpr';
  toolName: string;
  arguments: Record<string, Expression>; // Map arg name to its expression
}

// Represents CALC { formula: "...", vars: {...} } - REMOVED
/*
export interface CalcExpr extends BaseNode {
  kind: 'CalcExpr';
  formula: string;
  variables: Record<string, Expression>; // Map internal var name to its expression
}
*/

// --- Statements ---

export type Statement =
  | LetStatement
  | CallStatement
  | IfStatement
  | ForStatement
  | PrintStatement; // Include PRINT here as a statement

export interface LetStatement extends BaseNode {
  kind: 'LetStatement';
  variableName: string;
  value: Expression;
}

export interface CallStatement extends BaseNode {
  kind: 'CallStatement';
  toolName: string;
  arguments: Record<string, Expression>;
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Expression;
  thenBlock: Statement[]; // Body is a list of statements
  elseBlock?: Statement[]; // Optional else block
}

export interface ForStatement extends BaseNode {
  kind: 'ForStatement';
  iteratorVariable: string;
  iterable: Expression; // Expression evaluating to the list
  loopBlock: Statement[]; // Body is a list of statements
}

export interface PrintStatement extends BaseNode {
  kind: 'PrintStatement';
  value: Expression; // The expression to evaluate and print
}

// --- Top Level ---

export interface Script extends BaseNode {
  kind: 'Script';
  statements: Statement[];
}

// --- Helper Functions (Type Guards) ---
// These help in the interpreter to narrow down the type

export function isLiteralExpr(node: BaseNode): node is LiteralExpr {
    return (node as any)?.kind === 'LiteralExpr';
}

export function isVariableExpr(node: BaseNode): node is VariableExpr {
    return (node as any)?.kind === 'VariableExpr';
}

export function isBinaryOpExpr(node: BaseNode): node is BinaryOpExpr {
    return (node as any)?.kind === 'BinaryOpExpr';
}
// ... add type guards for all other node types as needed ...

export function isLetStatement(node: BaseNode): node is LetStatement {
     return (node as any)?.kind === 'LetStatement';
}

export function isCallStatement(node: BaseNode): node is CallStatement {
     return (node as any)?.kind === 'CallStatement';
}

export function isIfStatement(node: BaseNode): node is IfStatement {
     return (node as any)?.kind === 'IfStatement';
}

export function isForStatement(node: BaseNode): node is ForStatement {
     return (node as any)?.kind === 'ForStatement';
}

export function isPrintStatement(node: BaseNode): node is PrintStatement {
     return (node as any)?.kind === 'PrintStatement';
}
