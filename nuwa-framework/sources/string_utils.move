module nuwa_framework::string_utils {
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::object::{Self, ObjectID};
    use moveos_std::json;
    
    friend nuwa_framework::action_dispatcher;
    friend nuwa_framework::response_action;
    friend nuwa_framework::message;
    friend nuwa_framework::agent_state;
    friend nuwa_framework::channel_provider;
    friend nuwa_framework::state_providers;
    friend nuwa_framework::balance_provider;
    friend nuwa_framework::task_action;
    friend nuwa_framework::task_spec;
    
    //TODO migrate to std::string::starts_with
    public(friend) fun starts_with(haystack_str: &String, needle: &vector<u8>): bool {
        let haystack = string::bytes(haystack_str);
        let haystack_len = vector::length(haystack);
        let needle_len = vector::length(needle);

        if (needle_len > haystack_len) {
            return false
        };

        let i = 0;
        while (i < needle_len) {
            if (vector::borrow(haystack, i) != vector::borrow(needle, i)) {
                return false
            };
            i = i + 1;
        };

        true
    }

    public(friend) fun contains(s: &String, sub: &vector<u8>): bool {
        let bytes = string::bytes(s);
        let sub_len = vector::length(sub);
        let len = vector::length(bytes);
        let i = 0;
        if (sub_len > len) {
            return false
        };
        while (i <= len - sub_len) {
            if (is_substr_at(bytes, sub, i)) {
                return true
            };
            i = i + 1;
        };
        false
    }

    //TODO migrate to std::string or moveos_std::string_utils
    /// Split string by delimiter
    public(friend) fun split(s: &String, delimiter: &String): vector<String> {
        let result = vector::empty<String>();
        let bytes = string::bytes(s);
        let delimiter_bytes = string::bytes(delimiter);
        let delimiter_len = vector::length(delimiter_bytes);
        let len = vector::length(bytes);
        
        let start = 0;
        let i = 0;
        while (i <= len) {
            if (i == len || is_substr_at(bytes, delimiter_bytes, i)) {
                if (i >= start) {
                    let part = get_substr(bytes, start, i);
                    vector::push_back(&mut result, string::utf8(part));
                };
                if (i == len) break;
                start = i + delimiter_len;
                i = start;
            } else {
                i = i + 1;
            };
        };
        result
    } 

    /// Check if the substring appears at position i in bytes
    fun is_substr_at(bytes: &vector<u8>, sub: &vector<u8>, i: u64): bool {
        let sub_len = vector::length(sub);
        let len = vector::length(bytes);
        if (i + sub_len > len) return false;
        let j = 0;
        while (j < sub_len) {
            if (*vector::borrow(bytes, i + j) != *vector::borrow(sub, j)) {
                return false
            };
            j = j + 1;
        };
        true
    }

    /// Get substring from start to end (exclusive)
    public(friend) fun get_substr(bytes: &vector<u8>, start: u64, end: u64): vector<u8> {
        let result = vector::empty();
        let i = start;
        while (i < end) {
            vector::push_back(&mut result, *vector::borrow(bytes, i));
            i = i + 1;
        };
        result
    }

    public(friend) fun channel_id_to_string(channel_id: ObjectID): String {
        object::to_string(&channel_id)
    }

    public(friend) fun string_to_channel_id(channel_id_str: String): ObjectID {
        object::from_string(&channel_id_str)
    }

    public(friend) fun trim(s: &String): String {
        let bytes = string::bytes(s);
        let len = vector::length(bytes);
        let start = find_first_non_space(bytes, 0, len);
        let end = find_last_non_space(bytes, 0, len);
        if (start >= end) {
            return string::utf8(b"")
        };
        let result = get_substr(bytes, start, end + 1);
        string::utf8(result)
    }

    const SPACE_CHAR :u8 = 32u8;

    fun find_first_non_space(bytes: &vector<u8>, start: u64, end: u64): u64 {
        let i = start;
        while (i < end) {
            if (*vector::borrow(bytes, i) != SPACE_CHAR) {
                return i
            };
            i = i + 1;
        };
        end
    }
    

    fun find_last_non_space(bytes: &vector<u8>, start: u64, end: u64): u64 {
        let i = end;
        while (i > start) {
            if (*vector::borrow(bytes, i - 1) != SPACE_CHAR) {
                return i - 1
            };
            i = i - 1;
        };
        start
    }

    public(friend) fun strip_prefix(s: String, prefix: &vector<u8>): String {
        let bytes = string::bytes(&s);
        let prefix_len = vector::length(prefix);
        let len = vector::length(bytes);
        if (prefix_len > len) {
            return s
        };
        let i = 0;
        while (i < prefix_len) {
            if (*vector::borrow(bytes, i) != *vector::borrow(prefix, i)) {
                return s
            };
            i = i + 1;
        };
        string::utf8(get_substr(bytes, prefix_len, len))
    }

    // Helper function to format JSON sections
    public fun build_json_section<D>(data: &D): String {
        let json_str = string::utf8(json::to_json(data));
        // Add proper indentation and line breaks for better readability
        let formatted = string::utf8(b"```json\n");
        string::append(&mut formatted, json_str);
        string::append(&mut formatted, string::utf8(b"\n```\n"));
        formatted
    }

    #[test]
    fun test_trim() {
        let s = string::utf8(b"  hello, world  ");
        let trimmed = trim(&s);
        assert!(trimmed == string::utf8(b"hello, world"), 1);

        let s2 = string::utf8(b"  ");
        let trimmed2 = trim(&s2);
        assert!(trimmed2 == string::utf8(b""), 2);

        let s3 = string::utf8(b"");
        let trimmed3 = trim(&s3);
        assert!(trimmed3 == string::utf8(b""), 3);
    }

    #[test]
    fun test_split() {
        let s = string::utf8(b"hello,world,test");
        let parts = split(&s, &string::utf8(b","));
        assert!(vector::length(&parts) == 3, 1);
        assert!(*vector::borrow(&parts, 0) == string::utf8(b"hello"), 2);
        assert!(*vector::borrow(&parts, 1) == string::utf8(b"world"), 3);
        assert!(*vector::borrow(&parts, 2) == string::utf8(b"test"), 4);

        // Test empty parts
        let s2 = string::utf8(b"a,,b");
        let parts2 = split(&s2, &string::utf8(b","));
        assert!(vector::length(&parts2) == 3, 5);
        assert!(*vector::borrow(&parts2, 0) == string::utf8(b"a"), 6);
        assert!(*vector::borrow(&parts2, 1) == string::utf8(b""), 7);
        assert!(*vector::borrow(&parts2, 2) == string::utf8(b"b"), 8);
    }

}