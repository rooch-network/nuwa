// This is a simplified version of the NuwaScript interpreter
// In a real project, this would be integrated with the actual NuwaScript TypeScript implementation

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  handler: (args: Record<string, any>) => Promise<any>;
}

export interface InterpreterResult {
  output: string;
  error?: string;
}

export class Interpreter {
  private tools: Map<string, Tool> = new Map();
  private output: string[] = [];
  private variables: Map<string, any> = new Map();

  constructor() {}

  // Register a tool
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  // Execute the script
  async execute(script: string): Promise<InterpreterResult> {
    this.output = [];
    this.variables = new Map();
    
    try {
      const lines = script.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('//')) {
          continue;
        }
        
        if (line.startsWith('LET ')) {
          await this.executeLet(line);
        } else if (line.startsWith('CALL ')) {
          await this.executeCall(line);
        } else if (line.startsWith('IF ')) {
          // Execute IF statement
          const endIndex = this.findEndIf(lines, i);
          if (await this.executeIf(line, lines.slice(i + 1, endIndex))) {
            // If condition is true, skip the END statement
            i = endIndex;
          } else {
            // Look for possible ELSE statement
            const elseIndex = this.findElse(lines, i, endIndex);
            if (elseIndex !== -1) {
              // Execute ELSE block, then skip to END
              await this.executeBlock(lines.slice(elseIndex + 1, endIndex));
              i = endIndex;
            } else {
              // No ELSE, skip to END
              i = endIndex;
            }
          }
        }
      }
      
      return {
        output: this.output.join('\n')
      };
    } catch (error) {
      console.error('Interpreter error:', error);
      return {
        output: this.output.join('\n'),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Execute a LET statement
  private async executeLet(line: string): Promise<void> {
    const match = line.match(/LET\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*)/);
    if (!match) {
      throw new Error(`Invalid LET statement: ${line}`);
    }
    
    const [, varName, valueExpr] = match;
    const value = await this.evaluateExpression(valueExpr);
    this.variables.set(varName, value);
    
    this.output.push(`Variable ${varName} = ${this.formatValue(value)}`);
  }

  // Execute a CALL statement
  private async executeCall(line: string): Promise<any> {
    const match = line.match(/CALL\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)/);
    if (!match) {
      throw new Error(`Invalid CALL statement: ${line}`);
    }
    
    const [, toolName, argsStr] = match;
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    const args = await this.parseArgs(argsStr);
    const result = await tool.handler(args);
    
    this.output.push(`Call ${toolName}: ${this.formatValue(result)}`);
    return result;
  }

  // Parse arguments
  private async parseArgs(argsStr: string): Promise<Record<string, any>> {
    const args: Record<string, any> = {};
    
    if (!argsStr.trim()) {
      return args;
    }
    
    const argPairs = this.splitArgPairs(argsStr);
    
    for (const pair of argPairs) {
      const [name, valueExpr] = pair.split('=').map(s => s.trim());
      if (!name || !valueExpr) {
        throw new Error(`Invalid argument pair: ${pair}`);
      }
      
      args[name] = await this.evaluateExpression(valueExpr);
    }
    
    return args;
  }

  // Split argument pairs, considering nested parentheses
  private splitArgPairs(argsStr: string): string[] {
    const pairs: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        pairs.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      pairs.push(current.trim());
    }
    
    return pairs;
  }

  // Execute IF statement
  private async executeIf(line: string, block: string[]): Promise<boolean> {
    // Parse IF condition
    const match = line.match(/IF\s+(.*)\s+THEN/);
    if (!match) {
      throw new Error(`Invalid IF statement: ${line}`);
    }
    
    const condition = match[1];
    const result = await this.evaluateCondition(condition);
    
    if (result) {
      await this.executeBlock(block);
      return true;
    }
    
    return false;
  }

  // Execute a code block
  private async executeBlock(lines: string[]): Promise<void> {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines, comments, and END/ELSE
      if (!line || line.startsWith('//') || line === 'END' || line === 'ELSE') {
        continue;
      }
      
      if (line.startsWith('LET ')) {
        await this.executeLet(line);
      } else if (line.startsWith('CALL ')) {
        await this.executeCall(line);
      } else if (line.startsWith('IF ')) {
        const endIndex = this.findEndIf(lines, i);
        if (endIndex === -1) {
          throw new Error('Missing END for IF statement');
        }
        
        if (await this.executeIf(line, lines.slice(i + 1, endIndex))) {
          i = endIndex - i;
        } else {
          const elseIndex = this.findElse(lines, i, endIndex);
          if (elseIndex !== -1) {
            await this.executeBlock(lines.slice(elseIndex + 1, endIndex));
            i = endIndex - i;
          } else {
            i = endIndex - i;
          }
        }
      }
    }
  }

  // Find matching END
  private findEndIf(lines: string[], startIndex: number): number {
    let depth = 1;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('IF ')) {
        depth++;
      } else if (line === 'END') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    
    throw new Error('Missing END statement');
  }

  // Find ELSE statement
  private findElse(lines: string[], startIndex: number, endIndex: number): number {
    let depth = 1;
    
    for (let i = startIndex + 1; i < endIndex; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('IF ')) {
        depth++;
      } else if (line === 'END') {
        depth--;
      } else if (line === 'ELSE' && depth === 1) {
        return i;
      }
    }
    
    return -1;
  }

  // Evaluate expression value
  private async evaluateExpression(expr: string): Promise<any> {
    expr = expr.trim();
    
    // String literals
    if ((expr.startsWith('"') && expr.endsWith('"')) || 
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.substring(1, expr.length - 1);
    }
    
    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }
    
    // Boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    
    // Variable references
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
      if (this.variables.has(expr)) {
        return this.variables.get(expr);
      }
      throw new Error(`Undefined variable: ${expr}`);
    }
    
    // Property access (simple version)
    if (expr.includes('.')) {
      const parts = expr.split('.');
      const objName = parts[0];
      
      if (!this.variables.has(objName)) {
        throw new Error(`Undefined variable: ${objName}`);
      }
      
      let value = this.variables.get(objName);
      for (let i = 1; i < parts.length; i++) {
        if (value === null || value === undefined) {
          throw new Error(`Cannot access property ${parts[i]} of ${parts.slice(0, i).join('.')}`);
        }
        
        value = value[parts[i]];
      }
      
      return value;
    }
    
    // Simple addition
    if (expr.includes('+') && !this.isComparisonExpr(expr)) {
      const parts = expr.split('+').map(p => p.trim());
      let result = await this.evaluateExpression(parts[0]);
      
      for (let i = 1; i < parts.length; i++) {
        const right = await this.evaluateExpression(parts[i]);
        result = result + right; // Support both string concatenation and number addition
      }
      
      return result;
    }
    
    // Function calls
    if (expr.startsWith('CALL ')) {
      return this.executeCall(expr);
    }
    
    throw new Error(`Unsupported expression: ${expr}`);
  }

  // Evaluate condition expressions
  private async evaluateCondition(condition: string): Promise<boolean> {
    condition = condition.trim();
    
    // Handle comparison operations
    if (this.isComparisonExpr(condition)) {
      if (condition.includes('>=')) {
        const [left, right] = condition.split('>=').map(p => p.trim());
        return (await this.evaluateExpression(left)) >= (await this.evaluateExpression(right));
      } else if (condition.includes('<=')) {
        const [left, right] = condition.split('<=').map(p => p.trim());
        return (await this.evaluateExpression(left)) <= (await this.evaluateExpression(right));
      } else if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(p => p.trim());
        return (await this.evaluateExpression(left)) > (await this.evaluateExpression(right));
      } else if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(p => p.trim());
        return (await this.evaluateExpression(left)) < (await this.evaluateExpression(right));
      } else if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(p => p.trim());
        return (await this.evaluateExpression(left)) == (await this.evaluateExpression(right));
      } else if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(p => p.trim());
        return (await this.evaluateExpression(left)) != (await this.evaluateExpression(right));
      }
    }
    
    // Boolean values
    if (condition === 'true') return true;
    if (condition === 'false') return false;
    
    // Variable references
    return Boolean(await this.evaluateExpression(condition));
  }
  
  // Check if expression is a comparison
  private isComparisonExpr(expr: string): boolean {
    return (
      expr.includes('>=') ||
      expr.includes('<=') ||
      expr.includes('>') ||
      expr.includes('<') ||
      expr.includes('==') ||
      expr.includes('!=')
    );
  }

  // Format value for output
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    } else if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    } else {
      return String(value);
    }
  }
}

export function createInterpreter(): Interpreter {
  return new Interpreter();
}