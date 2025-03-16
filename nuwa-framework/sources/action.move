module nuwa_framework::action {
    use std::string::String;

    #[data_struct]
    struct ActionGroup has copy, drop, store{
        namespace: String,
        description: String,
        actions: vector<ActionDescription>,
    }
    
    #[data_struct]
    /// Action description for AI
    struct ActionDescription has copy, drop, store {
        name: String,
        description: String,
        args: vector<ActionArgument>,
        args_example: String,  // Changed from 'example' to 'args_example'
        usage_hint: String,       // When and how to use this action
        constraints: String,      // Requirements and limitations
    }

    #[data_struct]
    struct ActionArgument has copy, drop, store {
        name: String,
        type_desc: String,
        description: String,
        required: bool,
    }

    /// Create a new action argument
    public fun new_action_argument(
        name: String,
        type_desc: String,
        description: String,
        required: bool,
    ): ActionArgument {
        ActionArgument {
            name,
            type_desc,
            description,
            required,
        }
    }

    public fun new_action_description(
        name: String,
        description: String,
        args: vector<ActionArgument>,
        args_example: String,
        usage_hint: String,
        constraints: String,
    ): ActionDescription {
        ActionDescription {
            name,
            description,
            args,
            args_example,
            usage_hint,
            constraints,
        }
    }

    public fun new_action_group(
        namespace: String,
        description: String,
        actions: vector<ActionDescription>,
    ): ActionGroup {
        ActionGroup {
            namespace,
            description,
            actions,
        }
    }

    /// Getter functions for ActionDescription
    public fun get_name(action: &ActionDescription): &String {
        &action.name
    }

    public fun get_description(action: &ActionDescription): &String {
        &action.description
    }

    public fun get_args(action: &ActionDescription): &vector<ActionArgument> {
        &action.args
    }

    public fun get_args_example(action: &ActionDescription): &String {
        &action.args_example
    }

    public fun get_usage_hint(action: &ActionDescription): &String { &action.usage_hint }
    public fun get_constraints(action: &ActionDescription): &String { &action.constraints }

    // Add getters for ActionArgument
    public fun get_arg_name(arg: &ActionArgument): &String { &arg.name }
    public fun get_arg_type_desc(arg: &ActionArgument): &String { &arg.type_desc }
    public fun get_arg_description(arg: &ActionArgument): &String { &arg.description }
    public fun get_arg_required(arg: &ActionArgument): bool { arg.required }

    public fun get_actions_from_group(group: &ActionGroup): &vector<ActionDescription> {
        &group.actions
    }
}
