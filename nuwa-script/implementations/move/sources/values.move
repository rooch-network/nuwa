module nuwa_script_move::values {
    use std::string::{String};
    use std::vector;
    use std::option::{Self, Option};
    use moveos_std::simple_map::{Self, SimpleMap};
    use moveos_std::box::{Self, Box};
    use std::debug; // For potential printing/debugging
    use nuwa_script_move::errors; // Assuming errors module is defined

    // --- Constants for Type Tags ---
    const TYPE_NULL: u8 = 0; // Explicit Null type might be useful
    const TYPE_BOOL: u8 = 1;
    const TYPE_U64: u8 = 2; // Using u64 for numbers initially
    const TYPE_STRING: u8 = 3;
    const TYPE_LIST: u8 = 4;
    const TYPE_OBJECT: u8 = 5;

    // --- Error Codes ---
    // It's good practice to define errors in a separate module (e.g., errors.move)
    // but for simplicity here, we might define a local one or assume an error module.
    const E_WRONG_VALUE_TYPE: u64 = 101; // Example error code

    struct Value has copy, drop, store {
        type_tag: u8,
        // Use Option for each potential value type. Only one should be Some(...)
        bool_val: Option<bool>,
        u64_val: Option<u64>,
        string_val: Option<String>,
        // Use Box for recursive data structures to give Value a fixed size
        list_val: Option<Box<vector<Value>>>,
        object_val: Option<Box<SimpleMap<String, Value>>>,
    }

    // --- Constructor Functions ---

    public fun new_null(): Value {
        Value {
            type_tag: TYPE_NULL,
            bool_val: option::none(),
            u64_val: option::none(),
            string_val: option::none(),
            list_val: option::none(),
            object_val: option::none(),
        }
    }

    public fun new_bool(val: bool): Value {
        Value {
            type_tag: TYPE_BOOL,
            bool_val: option::some(val),
            u64_val: option::none(),
            string_val: option::none(),
            list_val: option::none(),
            object_val: option::none(),
        }
    }

    public fun new_u64(val: u64): Value {
        Value {
            type_tag: TYPE_U64,
            bool_val: option::none(),
            u64_val: option::some(val),
            string_val: option::none(),
            list_val: option::none(),
            object_val: option::none(),
        }
    }

    public fun new_string(val: String): Value {
        Value {
            type_tag: TYPE_STRING,
            bool_val: option::none(),
            u64_val: option::none(),
            string_val: option::some(val),
            list_val: option::none(),
            object_val: option::none(),
        }
    }

    public fun new_list(val: vector<Value>): Value {
        Value {
            type_tag: TYPE_LIST,
            bool_val: option::none(),
            u64_val: option::none(),
            string_val: option::none(),
            list_val: option::some(box::new(val)), // Box the vector
            object_val: option::none(),
        }
    }

    public fun new_object(val: SimpleMap<String, Value>): Value {
        Value {
            type_tag: TYPE_OBJECT,
            bool_val: option::none(),
            u64_val: option::none(),
            string_val: option::none(),
            list_val: option::none(),
            object_val: option::some(box::new(val)), // Box the map
        }
    }

    // --- Type Check Functions ---

    public fun is_null(v: &Value): bool { v.type_tag == TYPE_NULL }
    public fun is_bool(v: &Value): bool { v.type_tag == TYPE_BOOL }
    public fun is_u64(v: &Value): bool { v.type_tag == TYPE_U64 }
    public fun is_string(v: &Value): bool { v.type_tag == TYPE_STRING }
    public fun is_list(v: &Value): bool { v.type_tag == TYPE_LIST }
    public fun is_object(v: &Value): bool { v.type_tag == TYPE_OBJECT }
    public fun type_tag(v: &Value): u8 { v.type_tag }

    // --- Accessor Functions (Abort on Wrong Type) ---
    // These return a copy of the inner value.

    public fun borrow_bool(v: &Value): &bool {
        assert!(is_bool(v), E_WRONG_VALUE_TYPE);
        option::borrow(v.bool_val)
    }
     public fun get_bool(v: &Value): bool { *borrow_bool(v) } // Convenience getter

    public fun borrow_u64(v: &Value): &u64 {
        assert!(is_u64(v), E_WRONG_VALUE_TYPE);
        option::borrow(v.u64_val)
    }
    public fun get_u64(v: &Value): u64 { *borrow_u64(v) } // Convenience getter

    public fun borrow_string(v: &Value): &String {
        assert!(is_string(v), E_WRONG_VALUE_TYPE);
        option::borrow(v.string_val)
    }
    // Note: Returning String by copy might be expensive. Consider borrow patterns.
    public fun get_string(v: &Value): String { *borrow_string(v) } // Convenience getter

    public fun borrow_list(v: &Value): &vector<Value> {
        assert!(is_list(v), E_WRONG_VALUE_TYPE);
        box::borrow(option::borrow(v.list_val))
    }
    // Note: Returning vector<Value> by copy is likely very expensive. Use borrow.

    public fun borrow_object(v: &Value): &SimpleMap<String, Value> {
        assert!(is_object(v), E_WRONG_VALUE_TYPE);
        box::borrow(option::borrow(v.object_val))
    }
    // Note: Returning SimpleMap<String, Value> by copy is likely very expensive. Use borrow.


    // --- Potential Helper Functions ---
    // - equality comparison (value == value) - needs careful implementation for lists/objects
    // - debug print function

    // Example: Basic equality check (can be expanded)
    public fun equals(v1: &Value, v2: &Value): bool {
        if (v1.type_tag != v2.type_tag) { return false };
        let type_tag = v1.type_tag;
        if (type_tag == TYPE_NULL) { true }
        else if (type_tag == TYPE_BOOL) { *borrow_bool(v1) == *borrow_bool(v2) }
        else if (type_tag == TYPE_U64) { *borrow_u64(v1) == *borrow_u64(v2) }
        else if (type_tag == TYPE_STRING) { *borrow_string(v1) == *borrow_string(v2) }
        else if (type_tag == TYPE_LIST) { vector_equals(borrow_list(v1), borrow_list(v2)) } // Requires helper
        else if (type_tag == TYPE_OBJECT) { simple_map_equals(borrow_object(v1), borrow_object(v2)) } // Requires helper
        else { false /* Unknown type tag */ }
    }

    // Helper for list equality (recursive)
    fun vector_equals(l1: &vector<Value>, l2: &vector<Value>): bool {
        let len1 = vector::length(l1);
        if (len1 != vector::length(l2)) { return false };
        let i = 0;
        while (i < len1) {
            if (!equals(vector::borrow(l1, i), vector::borrow(l2, i))) {
                return false
            };
            i = i + 1;
        };
        true
    }

    // Helper for object equality (recursive, ignoring key order)
    fun simple_map_equals(m1: &SimpleMap<String, Value>, m2: &SimpleMap<String, Value>): bool {
        // Simple equality check based on size first
        if (simple_map::length(m1) != simple_map::length(m2)) { return false };

        // Iterate over one map and check keys/values in the other.
        // This requires iterating SimpleMap, which might need specific functions
        // depending on the exact SimpleMap implementation available.
        // For now, placeholder: Full implementation depends on SimpleMap iteration support.
        // TODO: Implement proper SimpleMap equality check based on available functions.
        // If SimpleMap iteration isn't easy, this equality check might be complex/costly.
        simple_map::length(m1) == simple_map::length(m2) // Placeholder - Incorrect for content check!
    }

    // TODO: Add other necessary functions, e.g., for type conversions if needed.

}
