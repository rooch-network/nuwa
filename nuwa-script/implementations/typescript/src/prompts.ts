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
- Comments start with //
- Basic operators are supported: +, -, *, /, ==, !=, >, <, >=, <=, AND, OR, NOT. Operator precedence follows standard rules.
- Member access uses dot notation: object.property.

# Core Statements:
LET varName = <expression>
CALL tool_name { arg1: <expression>, arg2: "literal", ... }
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

# User Task:
{user_task}

# Instructions:
Generate *only* the NuwaScript code required to complete the user task using the available tools and syntax. Do not include explanations or markdown formatting. Ensure all keywords and boolean/null literals are uppercase. Use available tools where appropriate. Use PRINT for intermediate thoughts or values if helpful, and use a reporting tool (like 'report_analysis_result') for the final answer if available.

Consider the current system state when generating your code. If the state contains relevant information for the task, use it to inform your response.

# NuwaScript Code:
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
 * @param includeState Whether to include state information in the prompt (default: true).
 * @returns The formatted prompt string.
 */
export function buildPrompt(registry: ToolRegistry, userTask: string, includeState: boolean = true): string {
    const toolSchemasString = formatToolSchemasForPrompt(registry);
    
    // Get state information if requested
    const stateInfo = includeState ? registry.formatStateForPrompt() : "No state information available.";
    
    const prompt = GENERATION_PROMPT_TEMPLATE
        .replace('{tools_schema}', toolSchemasString)
        .replace('{state_info}', stateInfo)
        .replace('{user_task}', userTask);
    
    return prompt;
}
