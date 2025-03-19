module nuwa_framework::user_profile {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::event;
    use moveos_std::signer;
    use moveos_std::timestamp;
    
    use nuwa_framework::name_registry;
    use nuwa_framework::link_verifier;
    
    /// Error codes
    const ErrorInvalidLinkType: u64 = 1;
    const ErrorInvalidLinkUrl: u64 = 2;
    const ErrorLinkNotFound: u64 = 3;
    const ErrorTooManyLinks: u64 = 4;
    const ErrorInvalidVerifier: u64 = 5;
    const ErrorInvalidCredential: u64 = 6;
    const ErrorAlreadyVerified: u64 = 7;
    const ErrorUsernameNotRegistered: u64 = 8;
    const ErrorLinkNotVerified: u64 = 9;
    const ErrorLinkAlreadyExists: u64 = 10;
    /// Maximum number of links a user can have
    const MAX_LINKS: u64 = 10;

    /// Supported link types
    const LINK_TYPE_WEBSITE: u8 = 0;
    const LINK_TYPE_TWITTER: u8 = 1;
    const LINK_TYPE_GITHUB: u8 = 2;
    const LINK_TYPE_TELEGRAM: u8 = 3;
    const LINK_TYPE_DISCORD: u8 = 4;
    const LINK_TYPE_LENS: u8 = 5;
    const LINK_TYPE_ENS: u8 = 6;
    const LINK_TYPE_CUSTOM: u8 = 255; // For future extensions

    /// URL patterns for different link types
    const URL_PATTERN_TWITTER_1: vector<u8> = b"twitter.com";
    const URL_PATTERN_TWITTER_2: vector<u8> = b"x.com";
    const URL_PATTERN_GITHUB: vector<u8> = b"github.com";
    const URL_PATTERN_TELEGRAM: vector<u8> = b"t.me";
    const URL_PATTERN_DISCORD: vector<u8> = b"discord.com";
    const URL_PATTERN_LENS: vector<u8> = b"lens.xyz";
    const URL_PATTERN_ENS: vector<u8> = b"ens.domains";

    /// Structure to represent a verification credential
    struct VerificationCredential has copy, drop, store {
        /// The address of the verifier
        verifier: address,
        /// The timestamp when the verification was issued
        issued_at: u64,
        /// The signature of the verification (can be used to verify the credential)
        signature: vector<u8>,
    }

    /// Structure to represent a social link
    struct SocialLink has copy, drop, store {
        link_type: u8,
        url: String,
        /// The summary of the link
        summary: String,
        /// The verification credential if the link is verified
        credential: Option<VerificationCredential>,
    }

    /// Events
    struct LinkAddedEvent has drop, copy, store {
        addr: address,
        link: SocialLink,
    }

    struct LinkRemovedEvent has drop, copy, store {
        addr: address,
        link_type: u8,
    }

    struct LinkVerifiedEvent has drop, copy, store {
        addr: address,
        link_type: u8,
        verifier: address,
    }

    struct LinkVerificationRevokedEvent has drop, copy, store {
        addr: address,
        link_type: u8,
    }

    struct UserProfile has key {
        /// The display name of the user
        name: String,
        /// The username of the user
        username: String,
        /// The avatar of the user
        avatar: String,
        /// User's social links
        links: vector<SocialLink>,
    }

    /// Initialize a new user profile
    public entry fun init_profile(
        caller: &signer,
        name: String,
        username: String,
        avatar: String,
    ) {
        // Verify that the username is registered in name_registry
        let caller_addr = signer::address_of(caller);
        name_registry::register_username(caller, username);

        let profile = UserProfile {
            name,
            username,
            avatar,
            links: vector::empty(),
        };
        
        let profile_obj = object::new_account_named_object(caller_addr, profile);
        object::transfer_extend(profile_obj, caller_addr);
    }

    public fun exists_profile(addr: address): bool {
        let profile_obj_id = object::account_named_object_id<UserProfile>(addr);
        object::exists_object(profile_obj_id)
    }

    public fun borrow_mut_profile(caller: &signer): &mut Object<UserProfile> {
        let caller_addr = signer::address_of(caller);
        let profile_obj_id = object::account_named_object_id<UserProfile>(caller_addr);
        borrow_mut_profile_by_id(profile_obj_id)
    }

    fun borrow_mut_profile_by_id(profile_obj_id: ObjectID): &mut Object<UserProfile> {
        object::borrow_mut_object_extend<UserProfile>(profile_obj_id)
    }

    // Helper function to check if URL contains a pattern
    fun contains_pattern(url_bytes: &vector<u8>, pattern: &vector<u8>): bool {
        let url_len = vector::length(url_bytes);
        let pattern_len = vector::length(pattern);
        if (url_len < pattern_len) return false;
        
        let i = 0;
        while (i <= url_len - pattern_len) {
            let matched = true;
            let j = 0;
            while (j < pattern_len) {
                if (*vector::borrow(url_bytes, i + j) != *vector::borrow(pattern, j)) {
                    matched = false;
                    break
                };
                j = j + 1;
            };
            if (matched) return true;
            i = i + 1;
        };
        false
    }

    /// Determine link type from URL
    fun determine_link_type(url: &String): u8 {
        let url_bytes = string::bytes(url);
        
        // Check URL patterns
        if (contains_pattern(url_bytes, &URL_PATTERN_TWITTER_1) || contains_pattern(url_bytes, &URL_PATTERN_TWITTER_2)) {
            LINK_TYPE_TWITTER
        } else if (contains_pattern(url_bytes, &URL_PATTERN_GITHUB)) {
            LINK_TYPE_GITHUB
        } else if (contains_pattern(url_bytes, &URL_PATTERN_TELEGRAM)) {
            LINK_TYPE_TELEGRAM
        } else if (contains_pattern(url_bytes, &URL_PATTERN_DISCORD)) {
            LINK_TYPE_DISCORD
        } else if (contains_pattern(url_bytes, &URL_PATTERN_LENS)) {
            LINK_TYPE_LENS
        } else if (contains_pattern(url_bytes, &URL_PATTERN_ENS)) {
            LINK_TYPE_ENS
        } else {
            LINK_TYPE_WEBSITE
        }
    }

    /// Add a social link to the user's profile
    public entry fun add_social_link(profile_obj: &mut Object<UserProfile>, url: String) {
        let owner = object::owner(profile_obj);
        let profile = object::borrow_mut(profile_obj);
        
        // Determine link type from URL
        let link_type = determine_link_type(&url);
        
        // Check if we've reached the maximum number of links
        assert!(vector::length(&profile.links) < MAX_LINKS, ErrorTooManyLinks);

        // Check if link type already exists
        let i = 0;
        let len = vector::length(&profile.links);
        while (i < len) {
            let existing_link = vector::borrow(&profile.links, i);
            if (existing_link.link_type == link_type) {
                if (link_type == LINK_TYPE_WEBSITE) {
                    // Website links types can be added multiple times, but the url must be different
                    assert!(existing_link.url != url, ErrorLinkAlreadyExists);
                } else {
                    abort ErrorLinkAlreadyExists
                };
            };
            i = i + 1;
        };

        // Create new link
        let link = SocialLink {
            link_type,
            url,
            summary: string::utf8(b""),
            credential: option::none(),
        };

        // Add link to profile
        vector::push_back(&mut profile.links, link);

        // Emit event
        event::emit(LinkAddedEvent {
            addr: owner,
            link,
        });
    }

    /// Update the user's profile name
    public entry fun update_user_profile_name(  
        profile_obj: &mut Object<UserProfile>,
        name: String,
    ) {
        let profile = object::borrow_mut(profile_obj);
        profile.name = name;
    }

    /// Update the user's profile avatar
    public entry fun update_user_profile_avatar(
        profile_obj: &mut Object<UserProfile>,
        avatar: String,
    ) {
        let profile = object::borrow_mut(profile_obj);
        profile.avatar = avatar;
    }

    /// Verify a social link with a credential
    public entry fun verify_link(
        verifier: &signer,
        profile_obj_id: ObjectID,
        link_type: u8,
        signature: vector<u8>,
    ) {
        //TODO validate signature

        let verifier_addr = signer::address_of(verifier);
        assert!(link_verifier::is_verifier(verifier_addr), ErrorInvalidVerifier);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);
        verify_link_internal(verifier_addr, profile_obj, link_type, signature);
    }

    fun verify_link_internal(
        verifier_addr: address,
        profile_obj: &mut Object<UserProfile>,
        link_type: u8,
        signature: vector<u8>,
    ) {
        let owner = object::owner(profile_obj); 
        let profile = object::borrow_mut(profile_obj);
        let links = &mut profile.links;
        let i = 0;
        let len = vector::length(links);
         
        while (i < len) {
            let link = vector::borrow_mut(links, i);
            if (link.link_type == link_type) {
                // Check if link is already verified
                assert!(option::is_none(&link.credential), ErrorAlreadyVerified);
                
                // Update link verification status
                link.credential = option::some(VerificationCredential {
                    verifier: verifier_addr,
                    issued_at: timestamp::now_milliseconds(),
                    signature: signature,
                });
                
                // Emit event
                event::emit(LinkVerifiedEvent {
                    addr: owner,
                    link_type,
                    verifier: verifier_addr,
                });
                return
            };
            i = i + 1;
        };
        
        abort ErrorLinkNotFound
    }

    /// Update the summary of a social link, only allows the verifier to update the summary of a verified link
    public entry fun update_link_summary(
        verifier: &signer,
        profile_obj_id: ObjectID,
        link_type: u8,
        summary: String,
    ) {
        let verifier_addr = signer::address_of(verifier);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);
        update_link_summary_internal(verifier_addr, profile_obj, link_type, summary);
    }

    fun update_link_summary_internal(
        verifier_addr: address,
        profile_obj: &mut Object<UserProfile>,
        link_type: u8,
        summary: String,
    ) {
        let profile = object::borrow_mut(profile_obj);
        let links = &mut profile.links;
        let i = 0;
        let len = vector::length(links);

        while (i < len) {
            let link = vector::borrow_mut(links, i);
            if (link.link_type == link_type) {
                assert!(option::is_some(&link.credential), ErrorLinkNotVerified);
                let credential = option::borrow(&link.credential);
                assert!(credential.verifier == verifier_addr, ErrorInvalidVerifier);
                link.summary = summary;
                return
            };
            i = i + 1;
        };

        abort ErrorLinkNotFound
    }

    /// Revoke a link verification
    public entry fun revoke_link_verification(
        verifier: &signer,
        profile_obj_id: ObjectID,
        link_type: u8,
    ) { 
        let verifier_addr = signer::address_of(verifier);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);
        revoke_link_verification_internal(verifier_addr, profile_obj, link_type);
    }

    fun revoke_link_verification_internal(
        verifier_addr: address,
        profile_obj: &mut Object<UserProfile>,
        link_type: u8,
    ) {
        let owner = object::owner(profile_obj);
        let profile = object::borrow_mut(profile_obj);
        let links = &mut profile.links;
        let i = 0;
        let len = vector::length(links);
        
        while (i < len) {
            let link = vector::borrow_mut(links, i);
            if (link.link_type == link_type) {
                assert!(option::is_some(&link.credential), ErrorLinkNotVerified);
                let credential = option::borrow(&link.credential);
                assert!(credential.verifier == verifier_addr, ErrorInvalidVerifier);

                link.credential = option::none();
                
                // Emit event
                event::emit(LinkVerificationRevokedEvent {
                    addr: owner,
                    link_type,
                });
                return
            };
            i = i + 1;
        };
        
        abort ErrorLinkNotFound
    }

    /// Remove a social link from the user's profile
    public entry fun remove_social_link(profile_obj: &mut Object<UserProfile>, link_type: u8) {
        let owner = object::owner(profile_obj);
        let profile = object::borrow_mut(profile_obj);
        let links = &mut profile.links;
        let i = 0;
        let len = vector::length(links);
        
        while (i < len) {
            let link = vector::borrow(links, i);
            if (link.link_type == link_type) {
                vector::remove(links, i);
                event::emit(LinkRemovedEvent {
                    addr: owner,
                    link_type,
                });
                return
            };
            i = i + 1;
        };
        
        abort ErrorLinkNotFound
    }

    /// Get all social links for a user
    public fun get_social_links(profile_obj: &Object<UserProfile>): &vector<SocialLink> {
        let profile = object::borrow(profile_obj);
        &profile.links
    }

    /// Get a specific social link by type
    public fun get_social_link_by_type(profile_obj: &Object<UserProfile>, link_type: u8): Option<SocialLink> {
        let profile = object::borrow(profile_obj);
        let links = &profile.links;
        let i = 0;
        let len = vector::length(links);
        
        while (i < len) {
            let link = vector::borrow(links, i);
            if (link.link_type == link_type) {
                return option::some(*link)
            };
            i = i + 1;
        };
        
        option::none()
    }

    /// Check if a user has a specific type of social link
    public fun has_social_link(profile_obj: &Object<UserProfile>, link_type: u8): bool {
        option::is_some(&get_social_link_by_type(profile_obj, link_type))
    }

    /// Get the verification credential for a link
    public fun get_link_credential(profile_obj: &Object<UserProfile>, link_type: u8): Option<VerificationCredential> {
        let link_opt = get_social_link_by_type(profile_obj, link_type);
        if (option::is_some(&link_opt)) {
            let link = option::borrow(&link_opt);
            link.credential
        } else {
            option::none()
        }
    }

    #[test_only]
    use moveos_std::tx_context;
    #[test_only]
    use nuwa_framework::test_helper;
    #[test_only]
    use moveos_std::string_utils;

    #[test]
    fun test_user_profile() {
        // Initialize test environment
        nuwa_framework::genesis::init_for_test();

        // Create test accounts
        let user_signer = test_helper::create_test_account();
        let verifier_signer = test_helper::create_test_account_with_address(@nuwa_framework);

        // Test profile initialization
        let username = string::utf8(b"testuser");
        let name = string::utf8(b"Test User");
        let avatar = string::utf8(b"https://example.com/avatar.png");
        init_profile(&user_signer, name, username, avatar);

        // Get profile object
        let profile_obj_id = object::account_named_object_id<UserProfile>(signer::address_of(&user_signer));
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);

        // Test adding social links
        let twitter_url = string::utf8(b"https://twitter.com/testuser");
        let github_url = string::utf8(b"https://github.com/testuser");
        add_social_link(profile_obj, twitter_url);
        add_social_link(profile_obj, github_url);

        // Verify links were added correctly
        let links = *get_social_links(profile_obj);
        assert!(vector::length(&links) == 2, 0);
        let twitter_link = vector::borrow(&links, 0);
        assert!(twitter_link.link_type == LINK_TYPE_TWITTER, 1);
        assert!(twitter_link.url == twitter_url, 2);

        // Test link verification
        let signature = vector::empty<u8>();
        verify_link_internal(signer::address_of(&verifier_signer), profile_obj, LINK_TYPE_TWITTER, signature);

        // Verify credential was added
        let credential_opt = get_link_credential(profile_obj, LINK_TYPE_TWITTER);
        assert!(option::is_some(&credential_opt), 3);
        let credential = option::borrow(&credential_opt);
        assert!(credential.verifier == signer::address_of(&verifier_signer), 4);

        // Test updating link summary
        let summary = string::utf8(b"Verified Twitter account");
        update_link_summary_internal(signer::address_of(&verifier_signer), profile_obj, LINK_TYPE_TWITTER, summary);
        let links = *get_social_links(profile_obj);
        let twitter_link = vector::borrow(&links, 0);
        assert!(twitter_link.summary == summary, 5);

        // Test revoking verification
        revoke_link_verification_internal(signer::address_of(&verifier_signer), profile_obj, LINK_TYPE_TWITTER);
        let credential_opt = get_link_credential(profile_obj, LINK_TYPE_TWITTER);
        assert!(option::is_none(&credential_opt), 6);

        // Test removing link
        remove_social_link(profile_obj, LINK_TYPE_TWITTER);
        let links = *get_social_links(profile_obj);
        assert!(vector::length(&links) == 1, 7);
        let github_link = vector::borrow(&links, 0);
        assert!(github_link.link_type == LINK_TYPE_GITHUB, 8);
    }

    #[test]
    #[expected_failure(abort_code = ErrorLinkAlreadyExists)]
    fun test_duplicate_link() {
        // Initialize test environment
        nuwa_framework::genesis::init_for_test();

        // Create test account
        let user = tx_context::fresh_address();
        let user_signer = test_helper::create_test_account_with_address(user);

        // Initialize profile
        let username = string::utf8(b"testuser");
        let name = string::utf8(b"Test User");
        let avatar = string::utf8(b"https://example.com/avatar.png");
        init_profile(&user_signer, name, username, avatar);

        // Get profile object
        let profile_obj_id = object::account_named_object_id<UserProfile>(user);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);

        // Try to add same link type twice
        let twitter_url1 = string::utf8(b"https://twitter.com/testuser1");
        let twitter_url2 = string::utf8(b"https://twitter.com/testuser2");
        add_social_link(profile_obj, twitter_url1);
        add_social_link(profile_obj, twitter_url2); // This should fail
    }

    #[test]
    #[expected_failure(abort_code = ErrorTooManyLinks)]
    fun test_max_links() {
        // Initialize test environment
        nuwa_framework::genesis::init_for_test();

        // Create test account
        let user = tx_context::fresh_address();
        let user_signer = test_helper::create_test_account_with_address(user);

        // Initialize profile
        let username = string::utf8(b"testuser");
        let name = string::utf8(b"Test User");
        let avatar = string::utf8(b"https://example.com/avatar.png");
        init_profile(&user_signer, name, username, avatar);

        // Get profile object
        let profile_obj_id = object::account_named_object_id<UserProfile>(user);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);

        // Try to add more than MAX_LINKS
        let i = 0;
        while (i <= MAX_LINKS) {
            let url = string::utf8(b"https://example");
            string::append(&mut url, string_utils::to_string_u64(i));
            string::append(&mut url, string::utf8(b".com"));
            add_social_link(profile_obj, url);
            i = i + 1;
        };
    }

    #[test]
    #[expected_failure(abort_code = ErrorLinkNotVerified)]
    fun test_update_unverified_link() {
        // Initialize test environment
        nuwa_framework::genesis::init_for_test();

        // Create test accounts
        let user = tx_context::fresh_address();
        let verifier = @nuwa_framework;
        let user_signer = test_helper::create_test_account_with_address(user);
        let verifier_signer = test_helper::create_test_account_with_address(verifier);

        // Initialize profile
        let username = string::utf8(b"testuser");
        let name = string::utf8(b"Test User");
        let avatar = string::utf8(b"https://example.com/avatar.png");
        init_profile(&user_signer, name, username, avatar);

        // Get profile object
        let profile_obj_id = object::account_named_object_id<UserProfile>(user);
        let profile_obj = borrow_mut_profile_by_id(profile_obj_id);

        // Add link
        let twitter_url = string::utf8(b"https://twitter.com/testuser");
        add_social_link(profile_obj, twitter_url);

        // Try to update unverified link
        let summary = string::utf8(b"Test summary");
        update_link_summary(&verifier_signer, profile_obj_id, LINK_TYPE_TWITTER, summary);
    }
}