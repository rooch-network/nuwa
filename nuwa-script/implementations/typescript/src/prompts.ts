import { ToolRegistry, ToolSchema } from './tools';

// Keep the template definition here
export const GENERATION_PROMPT_TEMPLATE = `You are an AI assistant that generates NuwaScript code to fulfill user requests.
NuwaScript is a simple, safe scripting language.

# NuwaScript Syntax Rules:
- Keywords MUST be UPPERCASE: LET, CALL, IF, THEN, ELSE, END, FOR, IN, DO, PRINT, NOW, AND, OR, NOT.
- Boolean literals MUST be UPPERCASE: TRUE, FALSE.
- Null literal MUST be UPPERCASE: NULL.
- Identifiers (variable names, tool names) are CASE-SENSITIVE and can be lower/mixed case.
- String literals use DOUBLE QUOTES: "hello".
- List literals use square brackets: [1, "a", TRUE, [nested_list]]. Elements are comma-separated.
- Object literals use curly braces: { key1: "value", "key-2": 123, key3: [1, 2] }. Keys can be identifiers or strings (double-quoted). Values can be any expression. Pairs are comma-separated.
- Comments start with //
- Basic arithmetic and comparison operators are supported: +, -, *, /, ==, !=, >, <, >=, <=.
- The '+' operator is ONLY for number addition, NOT string concatenation.
- Logical operators: AND, OR, NOT. Operator precedence follows standard rules.
- Member access uses dot notation: object.property.
- Array element access uses bracket notation: list[index]. Index MUST be an integer.

# Core Statements:
LET varName = <expression>
CALL tool_name { arg1: <expression>, arg2: "literal", ... } // With arguments
CALL tool_name {} // With no arguments (empty braces required)
// **IMPORTANT: Tool arguments MUST use curly braces {}, NOT parentheses (). Example: CALL my_tool { name: "test" }**
IF <condition_expression> THEN
  <statements>
ELSE // Optional
  <statements>
END
FOR itemVar IN <list_expression> DO
  <statements>
END
PRINT(<expression>) // Outputs a value

# Built-in Functions (as expressions):
NOW() // Returns current Unix timestamp (seconds)

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

# User Task:
{user_task}

# Instructions:

- Generate *only* the NuwaScript code required to complete the user task using the defined syntax and available tools.
- Output *only* raw code. Do not include explanations, markdown formatting, or code blocks (like \`\`\`).
- Ensure all keywords (LET, CALL, IF, etc.) and literals (TRUE, FALSE, NULL) are UPPERCASE. **Pay close attention to the CALL syntax using {}.**
- **Strictly use only the tools listed under "# Available Tools:". Do not invent or call unlisted tools.**
- **The '+' operator is ONLY for number addition. DO NOT use '+' for string concatenation, not even inside PRINT(). To print complex messages with variables, use multiple PRINT statements.**
- **Use PRINT(<expression>) statements freely to output intermediate values, confirmations, or helpful information directly to the user.**
- Consider the "# Current System State:" information when generating the code.
# NuwaScript Code (provide raw code with no markdown formatting or code blocks):
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
 * @param userTask The user's request.
 * @param options Optional parameters including application-specific guidance and state inclusion.
 * @returns The formatted prompt string.
 */
export function buildPrompt(
    registry: ToolRegistry, 
    userTask: string, 
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
        .replace('{app_specific_guidance}', appSpecificGuidance)
        .replace('{user_task}', userTask);
    
    return prompt;
}
