module nuwa_framework::string_utils {
    use std::vector;
    use std::string::{Self, String};
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
    
    public(friend) fun starts_with(haystack_str: &String, needle: &String): bool {
        if (string::length(needle) > string::length(haystack_str)) {
            return false
        };
        let sub = string::sub_string(haystack_str, 0, string::length(needle));
        sub == *needle
    }

    public(friend) fun contains(s: &String, sub: &String): bool {
        if (string::length(sub) == 0) {
            return true
        };
        string::index_of(s, sub) != string::length(s)
    }

    public(friend) fun split(s: &String, delimiter: &String): vector<String> {
        let result = vector::empty<String>();
        let start = 0;
        let len = string::length(s);
        
        while (start <= len) {
            let pos = if (start == len) {
                len
            } else {
                let sub = string::sub_string(s, start, len);
                let idx = string::index_of(&sub, delimiter);
                if (idx == string::length(&sub)) {
                    len
                } else {
                    start + idx
                }
            };
            
            if (pos >= start) {
                let part = string::sub_string(s, start, pos);
                vector::push_back(&mut result, part);
            };
            
            if (pos == len) break;
            start = pos + string::length(delimiter);
        };
        result
    }

    public(friend) fun trim(s: &String): String {
        let bytes = string::bytes(s);
        let len = vector::length(bytes);
        let start = find_first_non_space(bytes, 0, len);
        let end = find_last_non_space(bytes, 0, len);
        if (start >= end) {
            return string::utf8(b"")
        };
        let result = vector::slice(bytes, start, end + 1);
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

    public(friend) fun strip_prefix(s: String, prefix: &String): String {
        if (string::length(prefix) > string::length(&s)) {
            return s
        };
        if (starts_with(&s, prefix)) {
            string::sub_string(&s, string::length(prefix), string::length(&s))
        } else {
            s
        }
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

    #[test]
    fun test_contains() {
        let s = string::utf8(b"hello world");
        assert!(contains(&s, &string::utf8(b"hello")), 1);
        assert!(contains(&s, &string::utf8(b"world")), 2);
        assert!(contains(&s, &string::utf8(b"o w")), 3);
        assert!(contains(&s, &string::utf8(b"")), 4);
        assert!(!contains(&s, &string::utf8(b"world!")), 5);
        assert!(!contains(&s, &string::utf8(b"hello!")), 6);
        
        let empty = string::utf8(b"");
        assert!(contains(&empty, &string::utf8(b"")), 7);
        assert!(!contains(&empty, &string::utf8(b"a")), 8);
    }

    #[test]
    fun test_strip_prefix() {
        let s = string::utf8(b"hello world");
        assert!(strip_prefix(s, &string::utf8(b"hello ")) == string::utf8(b"world"), 1);
        assert!(strip_prefix(string::utf8(b"hello"), &string::utf8(b"he")) == string::utf8(b"llo"), 2);
        assert!(strip_prefix(string::utf8(b"hello"), &string::utf8(b"hello")) == string::utf8(b""), 3);
        // No match cases - should return original string
        assert!(strip_prefix(string::utf8(b"hello"), &string::utf8(b"world")) == string::utf8(b"hello"), 4);
        assert!(strip_prefix(string::utf8(b"hello"), &string::utf8(b"hello!")) == string::utf8(b"hello"), 5);
        
        let empty = string::utf8(b"");
        assert!(strip_prefix(empty, &string::utf8(b"")) == string::utf8(b""), 6);
        assert!(strip_prefix(empty, &string::utf8(b"a")) == string::utf8(b""), 7);
    }

    #[test]
    fun test_find_first_non_space() {
        let bytes = &b"  hello";
        assert!(find_first_non_space(bytes, 0, 7) == 2, 1);
        
        let all_spaces = &b"   ";
        assert!(find_first_non_space(all_spaces, 0, 3) == 3, 2);
        
        let empty = &b"";
        assert!(find_first_non_space(empty, 0, 0) == 0, 3);
        
        let no_spaces = &b"hello";
        assert!(find_first_non_space(no_spaces, 0, 5) == 0, 4);
    }

    #[test]
    fun test_find_last_non_space() {
        let bytes = &b"hello  ";
        assert!(find_last_non_space(bytes, 0, 7) == 4, 1);
        
        let all_spaces = &b"   ";
        assert!(find_last_non_space(all_spaces, 0, 3) == 0, 2);
        
        let empty = &b"";
        assert!(find_last_non_space(empty, 0, 0) == 0, 3);
        
        let no_spaces = &b"hello";
        assert!(find_last_non_space(no_spaces, 0, 5) == 4, 4);
    }

    #[test]
    fun test_utf8_contains() {
        // Test with two valid UTF-8 characters
        let s = string::utf8(x"E38182E38183"); // Two Hiragana characters
        // Test with first character
        assert!(contains(&s, &string::utf8(x"E38182")), 1);
        // Test with second character
        assert!(contains(&s, &string::utf8(x"E38183")), 2);
        // Test with both characters
        assert!(contains(&s, &string::utf8(x"E38182E38183")), 3);
        // Test with non-existing character
        assert!(!contains(&s, &string::utf8(x"E38184")), 4);
        // Test with empty string
        assert!(contains(&s, &string::utf8(b"")), 5);
    }

    #[test]
    fun test_utf8_starts_with() {
        // Test with two valid UTF-8 characters
        let s = string::utf8(x"E38182E38183"); // Two Hiragana characters
        // Test with first character
        assert!(starts_with(&s, &string::utf8(x"E38182")), 1);
        // Test with both characters
        assert!(starts_with(&s, &string::utf8(x"E38182E38183")), 2);
        // Test with second character (should fail)
        assert!(!starts_with(&s, &string::utf8(x"E38183")), 3);
        // Test with non-existing character
        assert!(!starts_with(&s, &string::utf8(x"E38184")), 4);
        // Test with empty string
        assert!(starts_with(&s, &string::utf8(b"")), 5);
    }

    #[test]
    fun test_utf8_split() {
        // Test with valid UTF-8 characters
        let s = string::utf8(x"E381822CE381832CE38184"); // Three Hiragana characters separated by commas
        let parts = split(&s, &string::utf8(b","));
        assert!(vector::length(&parts) == 3, 1);
        assert!(*vector::borrow(&parts, 0) == string::utf8(x"E38182"), 2);
        assert!(*vector::borrow(&parts, 1) == string::utf8(x"E38183"), 3);
        assert!(*vector::borrow(&parts, 2) == string::utf8(x"E38184"), 4);
    }

}