module nuwa_script_move::errors {

    // --- Generic Errors ---
    const E_NOT_IMPLEMENTED: u64 = 1;

    // --- Value Errors ---
    const E_WRONG_VALUE_TYPE: u64 = 101;
    const E_COMPARISON_FAILURE: u64 = 102;
    const E_OPERATION_TYPE_MISMATCH: u64 = 103; // e.g., trying '>' on non-numbers
    const E_MEMBER_ACCESS_ON_NON_OBJECT: u64 = 104;
    const E_MEMBER_NOT_FOUND: u64 = 105;
    const E_UNSUPPORTED_OPERATOR: u64 = 106;

    // --- Interpreter State Errors ---
    const E_VARIABLE_NOT_DEFINED: u64 = 201;

    // --- Control Flow Errors ---
    const E_IF_CONDITION_NOT_BOOLEAN: u64 = 301;
    const E_FOR_ITERABLE_NOT_LIST: u64 = 302;

    // --- Tool Errors ---
    const E_TOOL_REGISTRY_NOT_CONFIGURED: u64 = 401;
    const E_TOOL_NOT_FOUND: u64 = 402;
    const E_TOOL_EXECUTION_FAILED: u64 = 403; // Generic failure during tool call
    const E_TOOL_WRONG_ARGUMENT_TYPE: u64 = 404;
    const E_TOOL_MISSING_ARGUMENT: u64 = 405;

    // --- Function Call Errors ---
    const E_UNKNOWN_BUILTIN_FUNCTION: u64 = 501;
    const E_WRONG_ARGUMENT_COUNT: u64 = 502; // e.g., for PRINT, NOW
    const E_OUTPUT_HANDLER_ERROR: u64 = 503; // Error in the provided print handler

    // --- CALC Errors (if CALC string eval were implemented) ---
    // const E_CALC_LIBRARY_UNAVAILABLE: u64 = 601; // e.g., simpleeval equivalent missing
    // const E_CALC_INVALID_FORMULA: u64 = 602;
    // const E_CALC_NAME_NOT_DEFINED: u64 = 603;
    // const E_CALC_FUNCTION_NOT_ALLOWED: u64 = 604;
    // const E_CALC_DIVISION_BY_ZERO: u64 = 605;
    // const E_CALC_EVALUATION_ERROR: u64 = 606; // Other runtime errors

    // --- Arithmetic Errors (for inline evaluation) ---
    const E_DIVISION_BY_ZERO: u64 = 701;
    const E_ARITHMETIC_OVERFLOW: u64 = 702; // Important for fixed-size integers

    // --- Parsing/Serialization Errors (if handled on-chain) ---
    // const E_DESERIALIZATION_ERROR: u64 = 801;
    // const E_INVALID_AST_STRUCTURE: u64 = 802;

    // Consider adding helper functions for aborting with these codes if desired
    // public fun abort_wrong_value_type() { std::errors::abort(E_WRONG_VALUE_TYPE) }
}
