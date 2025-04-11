module nuwa_script_move::state {
    use std::string::{String};
    use std::option::{Option, Self};
    use moveos_std::simple_map::{Self, SimpleMap};

    // Import runtime Value type and errors
    use nuwa_script_move::values::{Self, Value};
    use nuwa_script_move::errors;

    /// Represents the runtime state of the interpreter, primarily the variable scope.
    /// For simplicity, starts with a single global scope.
    /// Requires `store` if the state itself needs to be stored (e.g., within an Agent object),
    /// otherwise `drop` might suffice if it's purely transient within a function call.
    /// Let's assume it might need storing.
    struct State has drop, store {
        variables: SimpleMap<String, Value>,
    }

    /// Creates a new, empty interpreter state.
    public fun new(): State {
        State {
            variables: simple_map::new(),
        }
    }

    /// Checks if a variable exists in the state.
    public fun variable_exists(state: &State, name: &String): bool {
        simple_map::contains_key(&state.variables, name)
    }

    /// Gets a reference to a variable's value. Aborts if the variable is not defined.
    /// Returns an immutable reference.
    public fun borrow_variable(state: &State, name: &String): &Value {
        assert!(variable_exists(state, name), errors::E_VARIABLE_NOT_DEFINED);
        simple_map::borrow(&state.variables, name)
    }

    /// Gets a mutable reference to a variable's value. Aborts if the variable is not defined.
    /// Useful if the interpreter needs to modify values in place (e.g., list append).
    public fun borrow_variable_mut(state: &mut State, name: &String): &mut Value {
        assert!(variable_exists(state, name), errors::E_VARIABLE_NOT_DEFINED);
        simple_map::borrow_mut(&mut state.variables, name)
    }

    /// Gets a copy of a variable's value. Returns None if the variable is not defined.
    /// Note: Copying large values (lists, objects) can be expensive.
    public fun get_variable_copy_option(state: &State, name: &String): Option<Value> {
        if (variable_exists(state, name)) {
            option::some(*borrow_variable(state, name)) // Dereference to copy
        } else {
            option::none()
        }
    }

     /// Gets a copy of a variable's value. Aborts if the variable is not defined.
    /// Note: Copying large values (lists, objects) can be expensive.
    public fun get_variable_copy(state: &State, name: &String): Value {
        *borrow_variable(state, name) // Dereference to copy
    }


    /// Sets or updates a variable's value in the state.
    /// If the variable already exists, its value is overwritten.
    public fun set_variable(state: &mut State, name: String, value: Value) {
        // SimpleMap's add function handles both insertion and update.
        simple_map::add(&mut state.variables, name, value);
    }

    /// Removes a variable from the state. Returns the value if it existed.
    /// Might be needed for proper scope management (e.g., exiting FOR loop).
    public fun remove_variable(state: &mut State, name: String): Option<Value> {
         if (variable_exists(state, &name)) {
            option::some(simple_map::remove(&mut state.variables, &name))
         } else {
            option::none()
         }
    }

    /// Temporarily sets a variable, saving the old value (if any).
    /// Useful for managing scope (e.g., FOR loop iterator variable).
    /// Returns the old value (or None) so it can be restored later.
    public fun set_temporary_variable(state: &mut State, name: String, value: Value): Option<Value> {
        let old_value = remove_variable(state, name); // Remove if exists, get old value
        set_variable(state, name, value); // Set the new value
        old_value // Return the old value (or None)
    }

    /// Restores a variable to its previous state after a temporary setting.
    /// Takes the 'old_value' returned by `set_temporary_variable`.
    public fun restore_variable(state: &mut State, name: String, old_value: Option<Value>) {
        if (option::is_some(&old_value)) {
            // If there was an old value, restore it.
            set_variable(state, name, option::destroy_some(old_value));
        } else {
            // If there was no old value, remove the temporary variable.
            remove_variable(state, name);
        }
    }

}
