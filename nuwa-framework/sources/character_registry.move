module nuwa_framework::character_registry {
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::event;

    friend nuwa_framework::character;

    /// Error codes
    const ErrorUsernameAlreadyRegistered: u64 = 1;
    const ErrorUsernameNotRegistered: u64 = 2;
    const ErrorNotOwner: u64 = 3;
    const ErrorUsernameTooShort: u64 = 4;
    const ErrorUsernameTooLong: u64 = 5;
    const ErrorUsernameInvalidChar: u64 = 6;
    const ErrorUsernameEmpty: u64 = 7;
    const ErrorUsernameOnlyNumbers: u64 = 8;

    // Username constraints
    const MIN_USERNAME_LENGTH: u64 = 4;
    const MAX_USERNAME_LENGTH: u64 = 16;

    /// Events
    struct UsernameRegistered has drop, copy, store {
        username: String,
        character_id: ObjectID,
    }

    struct UsernameUnregistered has drop, copy, store {
        username: String,
        character_id: ObjectID,
    }

    /// Empty struct for the registry object
    struct CharacterRegistry has key {
        // The fields will be dynamically added/removed as username registrations
    }
    
    /// Initialize the registry
    fun init() {
        let registry = CharacterRegistry {};
        let registry_obj = object::new_named_object(registry);
        object::to_shared(registry_obj);
    }

    /// Get the registry object
    fun borrow_registry_object(): &Object<CharacterRegistry> {
        let registry_obj_id = object::named_object_id<CharacterRegistry>();
        object::borrow_object<CharacterRegistry>(registry_obj_id)
    }

    /// Get mutable reference to registry object
    fun borrow_mut_registry_object(): &mut Object<CharacterRegistry> {
        let registry_obj_id = object::named_object_id<CharacterRegistry>();
        object::borrow_mut_object_shared<CharacterRegistry>(registry_obj_id)
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
    public(friend) fun register_username(username: String, character_id: ObjectID) {
        // Validate the username
        validate_username(&username);
        
        let registry_mut = borrow_mut_registry_object();
        
        // Check if username is already registered
        assert!(!object::contains_field(registry_mut, username), ErrorUsernameAlreadyRegistered);
        
        // Register the username by adding a field to the registry object
        object::add_field(registry_mut, username, character_id);
        
        // Emit event
        event::emit(UsernameRegistered { username, character_id });
    }
    
    /// Unregister a username
    public(friend) fun unregister_username(username: String) {
        let registry_mut = borrow_mut_registry_object();
        
        // Check if username exists
        if(!object::contains_field(registry_mut, username)){
            return
        };
        
        // Remove the username
        let character_id = object::remove_field(registry_mut, username);
        
        // Emit event
        event::emit(UsernameUnregistered { username, character_id });
    }
    
    /// Check if a username is available
    public fun is_username_available(username: &String): bool {
        let registry = borrow_registry_object();
        !object::contains_field(registry, *username)
    }
    
    /// Get object ID by username
    public fun get_character_id_by_username(username: &String): ObjectID {
        let registry = borrow_registry_object();
        assert!(object::contains_field(registry, *username), ErrorUsernameNotRegistered);
        *object::borrow_field(registry, *username)
    }
    
    /// Check if a username is valid (without checking availability)
    public fun is_username_valid(username: &String): bool {
        let (is_valid, has_non_number) = check_username_requirements(username);
        is_valid && has_non_number
    }

    #[test_only]
    public fun init_for_test() {
        init();
    }

    #[test]
    fun test_registry() {
        use std::string;
        
        // Initialize registry
        init_for_test();
        
        // Create test object ID (using a dummy value for testing)
        let dummy_object_id = object::named_object_id<CharacterRegistry>(); // Just using an existing ID for test
        
        // Test username registration
        let username = string::utf8(b"testuser");
        assert!(is_username_available(&username), 0);
        
        register_username(username, dummy_object_id);
        assert!(!is_username_available(&username), 1);
        
        let stored_id = get_character_id_by_username(&username);
        assert!(stored_id == dummy_object_id, 2);
        
        // Test unregistering
        unregister_username(username);
        assert!(is_username_available(&username), 3);
    }
}