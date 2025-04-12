import { BaseNode } from './ast'; // Optional: include node for location info
import { NuwaValue } from './values'; // Optional: include value details

/**
 * Base class for all NuwaScript interpreter errors.
 */
export class InterpreterError extends Error {
  public node?: BaseNode; // Optional: AST Node where error occurred

  constructor(message: string, node?: BaseNode) {
    super(message);
    this.name = 'InterpreterError';
    this.node = node;
    // Set the prototype explicitly for correct instanceof checks
    Object.setPrototypeOf(this, InterpreterError.prototype);
  }
}

/**
 * Generic runtime error during interpretation.
 */
export class RuntimeError extends InterpreterError {
  constructor(message: string, node?: BaseNode) {
    super(message, node);
    this.name = 'RuntimeError';
    Object.setPrototypeOf(this, RuntimeError.prototype);
  }
}

/**
 * Error related to type mismatches during operations.
 */
export class TypeError extends InterpreterError {
    public leftValue?: NuwaValue;
    public rightValue?: NuwaValue;
    public operator?: string;

    constructor(
        message: string,
        details?: {
            leftValue?: NuwaValue;
            rightValue?: NuwaValue;
            operator?: string;
            node?: BaseNode;
        }
    ) {
        super(message, details?.node);
        this.name = 'TypeError';
        this.leftValue = details?.leftValue;
        this.rightValue = details?.rightValue;
        this.operator = details?.operator;
        Object.setPrototypeOf(this, TypeError.prototype);
    }
}

/**
 * Error when trying to access an undefined variable.
 */
export class UndefinedVariableError extends InterpreterError {
    public variableName: string;

    constructor(variableName: string, node?: BaseNode) {
        super(`Variable '${variableName}' not defined.`, node);
        this.name = 'UndefinedVariableError';
        this.variableName = variableName;
        Object.setPrototypeOf(this, UndefinedVariableError.prototype);
    }
}

/**
 * Error when attempting member access on an invalid type or non-existent member.
 */
export class MemberAccessError extends InterpreterError {
    constructor(message: string, node?: BaseNode) {
        super(message, node);
        this.name = 'MemberAccessError';
        Object.setPrototypeOf(this, MemberAccessError.prototype);
    }
}

/**
 * Error when a tool called in the script is not found in the registry.
 */
export class ToolNotFoundError extends InterpreterError {
    public toolName: string;

    constructor(toolName: string, node?: BaseNode) {
        super(`Tool '${toolName}' not found.`, node);
        this.name = 'ToolNotFoundError';
        this.toolName = toolName;
        Object.setPrototypeOf(this, ToolNotFoundError.prototype);
    }
}

/**
 * Error related to incorrect arguments passed to a tool.
 */
export class ToolArgumentError extends InterpreterError {
    public toolName: string;

    constructor(toolName: string, message: string, node?: BaseNode) {
        super(`Argument error in tool '${toolName}': ${message}`, node);
        this.name = 'ToolArgumentError';
        this.toolName = toolName;
        Object.setPrototypeOf(this, ToolArgumentError.prototype);
    }
}

/**
 * Error occurring during the execution of a tool's implementation function.
 */
export class ToolExecutionError extends InterpreterError {
    public toolName: string;
    public originalError?: Error; // Keep the original error if available

    constructor(toolName: string, originalError: Error | unknown, node?: BaseNode) {
        const message = originalError instanceof Error ? originalError.message : String(originalError);
        super(`Error executing tool '${toolName}': ${message}`, node);
        this.name = 'ToolExecutionError';
        this.toolName = toolName;
        if (originalError instanceof Error) {
            this.originalError = originalError;
            this.stack = originalError.stack; // Preserve original stack if possible
        }
        Object.setPrototypeOf(this, ToolExecutionError.prototype);
    }
}

/**
 * Error for unsupported operators or operations.
 */
export class UnsupportedOperationError extends InterpreterError {
    public operation: string;

    constructor(operation: string, node?: BaseNode) {
        super(`Operation '${operation}' is not supported.`, node);
        this.name = 'UnsupportedOperationError';
        this.operation = operation;
        Object.setPrototypeOf(this, UnsupportedOperationError.prototype);
    }
}

/**
 * Error for division by zero.
 */
export class DivisionByZeroError extends InterpreterError {
    constructor(node?: BaseNode) {
        super('Division by zero.', node);
        this.name = 'DivisionByZeroError';
        Object.setPrototypeOf(this, DivisionByZeroError.prototype);
    }
}

/**
 * Error when an IF statement condition does not evaluate to a boolean.
 */
export class InvalidConditionError extends InterpreterError {
    constructor(message: string = 'IF condition did not evaluate to a boolean.', node?: BaseNode) {
        super(message, node);
        this.name = 'InvalidConditionError';
        Object.setPrototypeOf(this, InvalidConditionError.prototype);
    }
}

/**
 * Error when the iterable in a FOR statement is not a list/array.
 */
export class InvalidIterableError extends InterpreterError {
    constructor(message: string = 'FOR loop expected an iterable list.', node?: BaseNode) {
        super(message, node);
        this.name = 'InvalidIterableError';
        Object.setPrototypeOf(this, InvalidIterableError.prototype);
    }
}

// Add other specific error types as needed (e.g., ParserError, LexerError)
