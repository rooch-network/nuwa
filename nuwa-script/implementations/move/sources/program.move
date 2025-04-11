module nuwa_script_move::program {
    use std::string::{String};
    use std::vector;
    use std::option::{Option, Self};
    // Assuming Table or SimpleMap can be deserialized from JSON objects for 'args'
    // SimpleMap is often preferred for data structs if Tables aren't needed.
    use moveos_std::simple_map::{SimpleMap};

    // --- Value / Expression Representation ---
    // This struct represents a value or expression node in the JSON input.
    // Designed to be deserializable by from_json.
    #[data_struct]
    struct ValueExpr has copy, drop, store {
        // --- Literals (exactly one Some) ---
        literal_bool: Option<bool>,
        literal_u64: Option<u64>, // Assuming JSON numbers map to u64
        literal_string: Option<String>,
        literal_null: Option<bool>, // Use Option<bool> to signal presence of null
        // literal_list: Option<vector<ValueExpr>>, // If lists literals are needed
        // literal_object: Option<SimpleMap<String, ValueExpr>>, // If object literals are needed

        // --- Variable ---
        variable: Option<String>, // Variable name, e.g., "price", "nft.rarity"

        // --- Nested Operations (exactly one Some if not literal/variable) ---
        binary_op: Option<BinaryOpExpr>,
        unary_op: Option<UnaryOpExpr>,
        call_expr: Option<CallExpr>,
        // calc_expr: Option<CalcExpr>, // Add if CALC is kept in JSON format
        // func_call_expr: Option<FuncCallExpr>, // Add if NOW() etc. appear as nested expr
    }

    #[data_struct]
    struct BinaryOpExpr has copy, drop, store {
        op: String, // "==", ">", "AND", "+", etc.
        left: ValueExpr,
        right: ValueExpr,
    }

    #[data_struct]
    struct UnaryOpExpr has copy, drop, store {
        op: String, // "NOT"
        operand: ValueExpr,
    }

    // Represents `CALL tool { ... }` when used as a value/expression
    #[data_struct]
    struct CallExpr has copy, drop, store {
        tool: String,
        // Args map string keys to ValueExpr structs
        args: SimpleMap<String, ValueExpr>,
    }

    // Represents built-in funcs like NOW() if used as expression
    // #[data_struct]
    // struct FuncCallExpr has copy, drop, store { name: String }

    // Represents CALC { ... } if used as expression
    // #[data_struct]
    // struct CalcExpr has copy, drop, store { formula: String, vars: SimpleMap<String, ValueExpr> }

    // --- Statement Representation ---
    // Represents one object in the top-level JSON array.
    // The "type" field in JSON implicitly determines which Option field is Some.
    #[data_struct]
    struct Statement has copy, drop, store {
        // Based on README example structure, using Options for different types
        let_stmt: Option<LetStatement>,
        call_stmt: Option<CallStatement>,
        if_stmt: Option<IfStatement>,
        for_stmt: Option<ForStatement>,
        print_stmt: Option<PrintStatement>, // Assuming PRINT is a top-level statement type
        // Other possible statement types can be added here
    }

    // --- Statement Detail Structs ---
    #[data_struct]
    struct LetStatement has copy, drop, store {
        // Field name matches 'var' in README example for from_json compatibility
        var: String,
        // Field name 'value' can hold any ValueExpr type, including nested calls
        value: ValueExpr,
    }

    #[data_struct]
    struct CallStatement has copy, drop, store {
        tool: String,
        args: SimpleMap<String, ValueExpr>, // Args are string -> ValueExpr
    }

    #[data_struct]
    struct IfStatement has copy, drop, store {
        // Field name matches 'cond' in README example
        cond: ValueExpr,
        then_block: vector<Statement>, // Recursive vector of statements
        else_block: Option<vector<Statement>>, // Optional recursive vector
    }

    #[data_struct]
    struct ForStatement has copy, drop, store {
        iterator: String, // Name of the loop variable
        iterable: ValueExpr, // Expression evaluating to the list
        loop_block: vector<Statement>, // Recursive vector of statements
    }

    #[data_struct]
    struct PrintStatement has copy, drop, store {
         value: ValueExpr, // The value/expression to print
    }

    // --- JSON Parsing Function (Example, place in appropriate module) ---
    /*
    use moveos_std::json;
    use std::string::{String, into_bytes};
    use nuwa_script_move::program::Statement; // Import necessary structs

    /// Parses a JSON string representing an array of statements.
    public fun parse_script_statements_from_json(json_str: String): vector<Statement> {
        let bytes = into_bytes(json_str);
        // Consider adding error handling for json::from_json potentially failing
        json::from_json<vector<Statement>>(bytes)
    }
    */
}
