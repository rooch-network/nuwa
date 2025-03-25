module nuwa_framework::user_profile_for_agent{
    use std::string::{Self, String};
    use std::vector;
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::user_profile::{Self, SocialLink};
    use nuwa_framework::balance_state::{Self, BalanceState};
    use nuwa_framework::format_utils::{build_json_section};

    friend nuwa_framework::agent_input_info;

    #[data_struct]
    struct UserProfile has copy, drop, store {
        //TODO remove name, because the name can be repeated, maybe cause the agent confusion
        name: String,
        username: String,
        links: vector<String>,
        balances: vector<BalanceState>,
    }

    public fun get_user_profile(addr: address): UserProfile {
        let (name, username, social_links) = if (user_profile::exists_profile(addr)) {
            let profile = user_profile::get_profile(addr);
            (*user_profile::profile_name(profile), *user_profile::profile_username(profile), *user_profile::profile_links(profile))
        } else {
            (string::utf8(b""), string::utf8(b""), vector::empty<SocialLink>())
        };
        let balances = vector::empty();
        let balance_state = balance_state::get_balance_state<RGas>(addr);
        vector::push_back(&mut balances, balance_state);
        let links = vector::empty();
        vector::for_each(social_links, |link| {
            //TODO only add verified links
            let url = user_profile::social_link_url(&link);
            vector::push_back(&mut links, *url);
        });
        UserProfile {
            name,
            username,
            links,
            balances,
        }
    }

    public(friend) fun to_prompt(profile: &UserProfile): String {
        let prompt = string::utf8(b"\nSender Profile:");
        if (string::length(&profile.username) > 0) {
            string::append(&mut prompt, string::utf8(b"\n - Username: "));
            string::append(&mut prompt, profile.username);
        };
        if (vector::length(&profile.links) > 0) {
            string::append(&mut prompt, string::utf8(b"\n - Links:\n"));
            vector::for_each_ref(&profile.links, |link| {
                string::append(&mut prompt, string::utf8(b"- "));
                string::append(&mut prompt, *link);
            });
        };  
        if (vector::length(&profile.balances) > 0) {
            string::append(&mut prompt, string::utf8(b"\n - Balances:\n"));
            string::append(&mut prompt, build_json_section(&profile.balances));
        };
        prompt
    }
        
}