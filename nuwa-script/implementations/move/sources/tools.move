module nuwa_script_move::tools {
    use std::string::{String};
    use std::vector;
    use std::option::{Option, Self};
    use moveos_std::simple_map::{Self, SimpleMap};

    // Import runtime Value type constants and errors
    use nuwa_script_move::values; // Need access to type tag constants like TYPE_U64
    use nuwa_script_move::errors;

    /// Describes a single parameter for a tool.
    #[data_struct] // Schemas might be stored or passed around, requiring abilities
    struct ToolParameter has copy, drop, store {
        name: String,
        /// Expected type tag for the parameter's value (from values::TYPE_*)
        type_tag: u8,
        /// TODO: Add 'required: bool' field later if needed.
    }

    /// Describes the schema (interface) of a tool callable via CALL.
    #[data_struct]
    struct ToolSchema has copy, drop, store {
        /// The unique name used in CALL statements (case-sensitive recommended).
        name: String,
        description: String, // Optional description for documentation/AI.
        /// List of expected parameters. Order might matter depending on implementation.
        parameters: vector<ToolParameter>,
        /// Expected type tag for the return value (use values::TYPE_NULL for none).
        return_type_tag: u8,
    }

    /// The Tool Registry holds the schemas of available tools.
    /// The actual callable Move functions are *not* stored here directly.
    /// Assumes it might need to be stored, e.g., as part of Agent state.
    struct ToolRegistry has store {
        schemas: SimpleMap<String, ToolSchema>,
    }

    // --- Constructor and Basic Registry Functions ---

    public fun new_registry(): ToolRegistry {
        ToolRegistry {
            schemas: simple_map::new(),
        }
    }

    /// Registers a tool's schema. Aborts if the tool name is already registered.
    /// Consider adding access control in a real application.
    public fun register_tool(registry: &mut ToolRegistry, schema: ToolSchema) {
        let name = schema.name;
        // Using E_TOOL_NOT_FOUND might be confusing, consider a specific error
        // like E_TOOL_ALREADY_REGISTERED if adding to errors.move
        assert!(!simple_map::contains_key(&registry.schemas, &name), errors::E_TOOL_NOT_FOUND);
        simple_map::add(&mut registry.schemas, name, schema);
    }

    /// Checks if a tool with the given name is registered.
    public fun is_tool_registered(registry: &ToolRegistry, tool_name: &String): bool {
        simple_map::contains_key(&registry.schemas, tool_name)
    }

    /// Looks up and returns an immutable reference to a tool's schema. Aborts if not found.
    public fun borrow_tool_schema(registry: &ToolRegistry, tool_name: &String): &ToolSchema {
        assert!(is_tool_registered(registry, tool_name), errors::E_TOOL_NOT_FOUND);
        simple_map::borrow(&registry.schemas, tool_name)
    }

    /// Looks up and returns a copy of a tool's schema. Returns None if not found.
    public fun get_tool_schema_option(registry: &ToolRegistry, tool_name: &String): Option<ToolSchema> {
        if (is_tool_registered(registry, tool_name)) {
            option::some(*borrow_tool_schema(registry, tool_name)) // Dereference to copy
        } else {
            option::none()
        }
    }

    // --- Helper Functions for Creating Schemas/Parameters ---

    public fun new_parameter(name: String, type_tag: u8): ToolParameter {
        ToolParameter { name, type_tag }
    }

     public fun new_schema(
        name: String,
        description: String,
        parameters: vector<ToolParameter>,
        return_type_tag: u8
    ): ToolSchema {
        ToolSchema { name, description, parameters, return_type_tag }
    }

    // --- Accessors for Schema/Parameter fields ---
    public fun parameter_name(param: &ToolParameter): &String { &param.name }
    public fun parameter_type_tag(param: &ToolParameter): u8 { param.type_tag }
    public fun schema_name(schema: &ToolSchema): &String { &schema.name }
    public fun schema_description(schema: &ToolSchema): &String { &schema.description }
    public fun schema_parameters(schema: &ToolSchema): &vector<ToolParameter> { &schema.parameters }
    public fun schema_return_type_tag(schema: &ToolSchema): u8 { schema.return_type_tag }


    // --- Note on Invocation ---
    // The `ToolRegistry` defined here only manages metadata (schemas).
    // The actual mapping of a `tool_name` (String) to a specific Move function call,
    // along with argument type checking/conversion based on the schema,
    // must be implemented within the `interpreter.move` module or a dedicated
    // dispatcher function called by the interpreter. This typically involves
    // conditional logic (if/else if) based on the tool_name string.
}
