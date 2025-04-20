import { ToolRegistry, ToolSchema } from './tools';

// Keep the template definition here
export const GENERATION_PROMPT_TEMPLATE = `# NuwaScript Syntax Rules:
- Keywords MUST be UPPERCASE: LET, CALL, IF, THEN, ELSE, END, FOR, IN, DO, AND, OR, NOT. (PRINT, NOW, FORMAT are built-in functions, not keywords)
- Built-in function names MUST be UPPERCASE: PRINT, NOW, FORMAT.
- Boolean literals MUST be lowercase: true, false.
- Null literal MUST be lowercase: null.
- Identifiers (variable names, tool names) are CASE-SENSITIVE and can be lower/mixed case.
- String literals use DOUBLE QUOTES: "hello".
- List literals use square brackets: [1, "a", TRUE, [nested_list]]. Elements are comma-separated.
- Object literals use curly braces: { key1: "value", "key-2": 123, key3: [1, 2] }. Keys can be identifiers or strings (double-quoted). Values can be any expression. Pairs are comma-separated.
- Comments start with //
- Basic arithmetic and comparison operators are supported: +, -, *, /, %, ==, !=, >, <, >=, <=.
- The '+' operator is ONLY for number addition, NOT string concatenation.
- Logical operators: AND, OR, NOT. Operator precedence follows standard rules.
- Member access uses dot notation: object.property.
- Array element access uses bracket notation: list[index]. Index MUST be an integer.

# Core Statements:
LET varName = <expression> // Assign any expression (literal, variable, result of CALL/CALC/function)
LET resultVar = CALL tool_name { arg1: <value>, ... } // Assign tool result to variable
CALL tool_name { arg1: <expression>, ... } // Call tool as a standalone statement
// **IMPORTANT: Tool arguments MUST use curly braces {}, NOT parentheses (). Example: CALL my_tool { name: "test" }**
IF <condition_expression> THEN
  <statements>
ELSE // Optional
  <statements>
END
FOR itemVar IN <list_expression> DO
  <statements>
END
// PRINT(<expression>) // Outputs a value - Moved to Built-in Functions

# Built-in Functions (as expressions):
PRINT(<expression>) // Outputs the string representation of the expression (default adds newline) and returns NULL.
NOW() // Returns current Unix timestamp (seconds) as a number.
FORMAT(template_string, values_object) // Formats a string using named placeholders ({key}) from the values_object. Returns the formatted string. Example: FORMAT("User: {name}", {name: userName})

# Available Tools:
You have access to the following tools. Only use these registered tools with the exact names provided:
--- START TOOL SCHEMAS ---
{tools_schema}
--- END TOOL SCHEMAS ---

# Current System State:
This represents the current state of the system. You can use this information to inform your response:
--- START STATE ---
{state_info}
--- END STATE ---

{app_specific_guidance}

# Instructions:

- Generate *only* the NuwaScript code required to complete the user task using the defined syntax and available tools.
- Output *only* raw code. Do not include explanations, markdown formatting, or code blocks (like \`\`\`).
- Ensure all keywords (LET, CALL, IF, etc.) are UPPERCASE. Built-in function names (PRINT, NOW, FORMAT) MUST also be UPPERCASE. Literals true, false, null MUST be lowercase. **Pay close attention to the CALL syntax using {}.**
- **Strictly use only the tools listed under "# Available Tools:". Do not invent or call unlisted tools.**
- **CRITICAL: The '+' operator is ONLY for number addition. DO NOT use '+' for string concatenation.**
- **To create complex strings with variables, ALWAYS use the FORMAT(template_string, {key: value, ...}) function.**
- **Use PRINT(<expression>) statements freely to output intermediate values, confirmations, or helpful information directly to the user. Remember PRINT adds a newline.**
  - **Example:** To print a message like "Placing the tree trunk at x=100, y=200", DO NOT generate code like \`// PRINT("Placing... x=" + trunkX + ... )\`. INSTEAD, generate this code: \`PRINT(FORMAT("Placing the tree trunk at x={tx}, y={ty}", {tx: trunkX, ty: trunkY}))\`.
- **IMPORTANT: When assigning the result of a tool call to a variable, the \`CALL\` keyword is mandatory. Use the format: \`LET variable = CALL tool_name { ... }\`. Never omit the \`CALL\` keyword in this context.**
- Consider the "# Current System State:" information when generating the code.
`;


/**
 * Formats the tool schemas into a string suitable for the prompt.
 * @param registry The ToolRegistry containing the available tools.
 * @returns A formatted string representation of the tool schemas.
 */
function formatToolSchemasForPrompt(registry: ToolRegistry): string {
    const schemas = registry.getAllSchemas();
    if (schemas.length === 0) {
        return "No tools available.";
    }
    // Format schemas as simple descriptions
    return schemas.map(s => {
        const params = s.parameters.map(p => `${p.name}: ${p.type}${p.required === false ? '?' : ''}`).join(', ');
        return `- ${s.name}(${params}): ${s.description} -> ${s.returns}`;
    }).join('\n');
}

/**
 * Builds the complete prompt string for the LLM.
 * @param registry The ToolRegistry containing available tools.
 * @param options Optional parameters including application-specific guidance and state inclusion.
 * @returns The formatted prompt string.
 */
export function buildPrompt(
    registry: ToolRegistry, 
    options: {
        includeState?: boolean;
        appSpecificGuidance?: string;
    } = {}
): string {
    const { includeState = true, appSpecificGuidance = "" } = options;
    const toolSchemasString = formatToolSchemasForPrompt(registry);
    
    // Get state information if requested
    const stateInfo = includeState ? registry.formatStateForPrompt() : "No state information available.";
    
    const prompt = GENERATION_PROMPT_TEMPLATE
        .replace('{tools_schema}', toolSchemasString)
        .replace('{state_info}', stateInfo)
        .replace('{app_specific_guidance}', appSpecificGuidance);
    
    return prompt;
}
