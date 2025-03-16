module nuwa_framework::name_registry {
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::object::{Self, Object};
    use moveos_std::event;

    friend nuwa_framework::agent;
    friend nuwa_framework::genesis;

    /// Error codes
    const ErrorUsernameAlreadyRegistered: u64 = 1;
    const ErrorUsernameNotRegistered: u64 = 2;
    const ErrorNotOwner: u64 = 3;
    const ErrorUsernameTooShort: u64 = 4;
    const ErrorUsernameTooLong: u64 = 5;
    const ErrorUsernameInvalidChar: u64 = 6;
    const ErrorUsernameEmpty: u64 = 7;
    const ErrorUsernameOnlyNumbers: u64 = 8;
    const ErrorAddressAlreadyRegistered: u64 = 9;
    // Username constraints
    const MIN_USERNAME_LENGTH: u64 = 4;
    const MAX_USERNAME_LENGTH: u64 = 16;

    /// Events
    struct UsernameRegistered has drop, copy, store {
        username: String,
        addr: address,
    }

    struct UsernameUnregistered has drop, copy, store {
        username: String,
        addr: address,
    }

    /// Empty struct for the registry object
    struct NameRegistry has key {
        // The fields will be dynamically added/removed as username registrations
    }
    
    /// Initialize the registry
    public(friend) fun genesis_init() {
        let registry = NameRegistry {};
        let registry_obj = object::new_named_object(registry);
        object::to_shared(registry_obj);
    }

    /// Get the registry object
    fun borrow_registry_object(): &Object<NameRegistry> {
        let registry_obj_id = object::named_object_id<NameRegistry>();
        object::borrow_object<NameRegistry>(registry_obj_id)
    }

    /// Get mutable reference to registry object
    fun borrow_mut_registry_object(): &mut Object<NameRegistry> {
        let registry_obj_id = object::named_object_id<NameRegistry>();
        object::borrow_mut_object_shared<NameRegistry>(registry_obj_id)
    }

    /// Internal function to check if a username meets all requirements
    /// Returns (is_valid, has_non_number) tuple
    fun check_username_requirements(username: &String): (bool, bool) {
        let bytes = string::bytes(username);
        let length = vector::length(bytes);
        
        // Check basic requirements
        if (length < MIN_USERNAME_LENGTH || length > MAX_USERNAME_LENGTH || length == 0) {
            return (false, false)
        };
        
        // Check for valid characters
        let has_non_number = false;
        let i = 0;
        while (i < length) {
            let char_byte = *vector::borrow(bytes, i);
            let is_lowercase_letter = char_byte >= 97 && char_byte <= 122; // a-z
            let is_uppercase_letter = char_byte >= 65 && char_byte <= 90;  // A-Z
            let is_digit = char_byte >= 48 && char_byte <= 57;            // 0-9
            let is_underscore = char_byte == 95;                          // _
            
            if (is_lowercase_letter || is_uppercase_letter || is_underscore) {
                has_non_number = true;
            };
            
            if (!(is_lowercase_letter || is_uppercase_letter || is_digit || is_underscore)) {
                return (false, has_non_number)
            };
            
            i = i + 1;
        };
        
        (true, has_non_number)
    }

    /// Validate a username
    public fun validate_username(username: &String) {
        let bytes = string::bytes(username);
        let length = vector::length(bytes);
        
        // Check if username is empty
        assert!(length > 0, ErrorUsernameEmpty);
        
        // Check length constraints
        assert!(length >= MIN_USERNAME_LENGTH, ErrorUsernameTooShort);
        assert!(length <= MAX_USERNAME_LENGTH, ErrorUsernameTooLong);
        
        let (is_valid, has_non_number) = check_username_requirements(username);
        
        // Check if all characters are valid
        assert!(is_valid, ErrorUsernameInvalidChar);
        
        // Username can't be all numbers
        assert!(has_non_number, ErrorUsernameOnlyNumbers);
    }

    /// Register a username for an object
    public(friend) fun register_username(username: String, addr: address) {
        // Validate the username
        validate_username(&username);
        
        let registry_mut = borrow_mut_registry_object();
        
        // Check if username is already registered
        assert!(!object::contains_field(registry_mut, username), ErrorUsernameAlreadyRegistered);
        assert!(!object::contains_field(registry_mut, addr), ErrorAddressAlreadyRegistered);
        
        // Register the username by adding a field to the registry object
        object::add_field(registry_mut, username, addr);
        object::add_field(registry_mut, addr, username);
        
        // Emit event
        event::emit(UsernameRegistered { username, addr });
    }
    
    /// Unregister a username
    public(friend) fun unregister_username(username: String) {
        let registry_mut = borrow_mut_registry_object();
        
        // Check if username exists
        if(!object::contains_field(registry_mut, username)){
            return
        };
        
        // Remove the username
        let addr = object::remove_field(registry_mut, username);
        let _name: String = object::remove_field(registry_mut, addr);
        // Emit event
        event::emit(UsernameUnregistered { username, addr });
    }
    
    /// Check if a username is available
    public fun is_username_available(username: &String): bool {
        let registry = borrow_registry_object();
        !object::contains_field(registry, *username)
    }
    
    /// Get object ID by username, return 0x0 if not registered
    public fun get_address_by_username(username: &String): address {
        let registry = borrow_registry_object();
        if(!object::contains_field(registry, *username)){
            @0x0
        }else{
            *object::borrow_field(registry, *username)
        }
    }

    /// Get username by address, return the address to string if not registered
    public fun get_username_by_address(addr: address): String {
        let registry = borrow_registry_object();
        if(!object::contains_field(registry, addr)){
            string::utf8(b"")
        }else{
            *object::borrow_field(registry, addr)
        }
    }

    public fun get_username_by_addreses(addresses: vector<address>): vector<String> {
        let registry = borrow_registry_object();
        let usernames = vector[];
        let i = 0;
        let length = vector::length(&addresses);
        while (i < length) {
            let addr = *vector::borrow(&addresses, i);
            let username = if(object::contains_field(registry, addr)){
                *object::borrow_field(registry, addr)
            }else{
                string::utf8(b"")
            };
            vector::push_back(&mut usernames, username);
            i = i + 1;
        };
        usernames
    }

    public fun get_address_by_usernames(usernames: vector<String>): vector<address> {
        let registry = borrow_registry_object();
        let addresses = vector[];
        let i = 0;
        let length = vector::length(&usernames);
        while (i < length) {
            let username = *vector::borrow(&usernames, i);
            let address = if(object::contains_field(registry, username)){
                *object::borrow_field(registry, username)
            }else{
                @0x0
            };
            vector::push_back(&mut addresses, address);
            i = i + 1;
        };
        addresses
    }
    
    /// Check if a username is valid (without checking availability)
    public fun is_username_valid(username: &String): bool {
        let (is_valid, has_non_number) = check_username_requirements(username);
        is_valid && has_non_number
    }

    #[test]
    fun test_registry() {
        use std::string;
        use moveos_std::tx_context;
        // Initialize registry
        genesis_init();
        
        let addr = tx_context::fresh_address();

        // Test username registration
        let username = string::utf8(b"testuser");
        assert!(is_username_available(&username), 0);
        
        register_username(username, addr);
        assert!(!is_username_available(&username), 1);
        
        let stored_addr = get_address_by_username(&username);
        assert!(stored_addr == addr, 2);
        
        // Test unregistering
        unregister_username(username);
        assert!(is_username_available(&username), 3);
    }
}