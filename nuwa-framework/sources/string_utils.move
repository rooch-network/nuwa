//Deprecated
module nuwa_framework::string_utils {

    use std::string::{String};
    use moveos_std::object::{ObjectID};
    
    friend nuwa_framework::action_dispatcher;
    friend nuwa_framework::response_action;
    friend nuwa_framework::message;
    friend nuwa_framework::agent_state;
    friend nuwa_framework::channel_provider;
    friend nuwa_framework::state_providers;
    friend nuwa_framework::balance_provider;
    friend nuwa_framework::task_action;
    friend nuwa_framework::task_spec;
    
    public(friend) fun starts_with(_haystack_str: &String, _needle: &vector<u8>): bool {
        abort 0
    }

    public(friend) fun contains(_s: &String, _sub: &vector<u8>): bool {
        abort 0
    }

    public(friend) fun split(_s: &String, _delimiter: &String): vector<String> {
        abort 0
    } 

    public(friend) fun get_substr(_bytes: &vector<u8>, _start: u64, _end: u64): vector<u8> {
        abort 0
    }

    public(friend) fun channel_id_to_string(_channel_id: ObjectID): String {
        abort 0
    }

    public(friend) fun string_to_channel_id(_channel_id_str: String): ObjectID {
        abort 0
    }

    public(friend) fun trim(_s: &String): String {
        abort 0
    }

    public(friend) fun strip_prefix(_s: String, _prefix: &vector<u8>): String {
        abort 0 
    }

    public fun build_json_section<D>(_data: &D): String {
        abort 0
    }
}