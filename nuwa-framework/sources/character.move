module nuwa_framework::character {

    use std::string::String;

    use moveos_std::object::{Self, Object};
    use moveos_std::json;
    use moveos_std::signer;

    use nuwa_framework::character_registry;

    const ErrorUsernameAlreadyRegistered: u64 = 1;


    /// Character represents an AI agent's personality
    struct Character has key,store {
        /// The name of the character
        name: String,
        /// The unique identifier for the character
        username: String,
        /// The avatar of the character
        avatar: String,
        /// One-line description of the character
        description: String,
        /// Instructions for the character when the agent is running
        instructions: String,
    }

    #[data_struct]
    /// Data structure for character creation
    struct CharacterData has copy, drop, store {
        name: String,
        username: String,
        avatar: String,
        description: String,
        instructions: String,
    }

    public fun new_character_data(
        name: String,
        username: String,
        avatar: String,
        description: String,
        instructions: String,
    ) : CharacterData {
        CharacterData {
            name,
            username,
            avatar,
            description,
            instructions,
        }
    }

    fun new_character(data: CharacterData) : Object<Character> {
        assert!(character_registry::is_username_available(&data.username), ErrorUsernameAlreadyRegistered);
        let character = Character {
            name: data.name,
            username: data.username,
            avatar: data.avatar,
            description: data.description,
            instructions: data.instructions,
        };
        // Every account only has one character
        let obj = object::new(character);
        let character_id = object::id(&obj);
        character_registry::register_username(data.username, character_id);
        obj
    }

    fun drop_character(c: Character) {
        let Character {
            name: _,
            username,
            avatar: _,
            description: _,
            instructions: _,
        } = c;
        character_registry::unregister_username(username);
    }

    public fun create_character(data: CharacterData): Object<Character> {
        let co = new_character(data);
        co
    } 

    public entry fun create_character_from_json(caller: &signer, json: vector<u8>){
        let data = json::from_json<CharacterData>(json);
        let co = create_character(data);
        object::transfer(co, signer::address_of(caller));
    }

    public entry fun create_character_entry(caller: &signer, name: String, username: String, avatar: String, description: String, instructions: String){
        let data = new_character_data(name, username, avatar, description, instructions);
        let co = create_character(data);
        object::transfer(co, signer::address_of(caller));
    }

    public entry fun destroy_character(co: Object<Character>){
        let c = object::remove(co);
        drop_character(c);
    }

    public fun get_name(character: &Character): &String {
        &character.name
    }

    public fun get_username(character: &Character): &String {
        &character.username
    }

    public fun get_description(character: &Character): &String {
        &character.description
    }

    public fun get_instructions(character: &Character): &String {
        &character.instructions
    }

    public fun get_avatar(character: &Character): &String {
        &character.avatar
    }

    // Add these functions to allow updating character properties
    public entry fun update_name(character: &mut Object<Character>, new_name: String) {
        let c = object::borrow_mut(character);
        c.name = new_name;
    }

    public entry fun update_description(character: &mut Object<Character>, new_description: String) {
        let c = object::borrow_mut(character);
        c.description = new_description;
    }

    public entry fun update_instructions(character: &mut Object<Character>, new_instructions: String) {
        let c = object::borrow_mut(character);
        c.instructions = new_instructions;
    }

    public entry fun update_avatar(character: &mut Object<Character>, new_avatar: String) {
        let c = object::borrow_mut(character);
        c.avatar = new_avatar;
    }

    #[test(caller = @0x42)]
    fun test_character() {
        use std::string;
        nuwa_framework::character_registry::init_for_test();
        // Create test character
        let data = new_character_data(
            string::utf8(b"Dobby"),
            string::utf8(b"dobby"),
            string::utf8(b""),
            string::utf8(b"Dobby is a free assistant who helps because of his enormous heart."),
            string::utf8(b"Creative problem-solving"),
        );
        
        let character_obj = create_character(data);
        let character = object::borrow(&character_obj);
        
        // Verify character fields
        assert!(*get_name(character) == string::utf8(b"Dobby"), 1);
        assert!(*get_description(character) == string::utf8(b"Dobby is a free assistant who helps because of his enormous heart."), 2);
        assert!(*get_instructions(character) == string::utf8(b"Creative problem-solving"), 3);
        assert!(*get_avatar(character) == string::utf8(b""), 4);
       
        // Test update_description
        update_description(&mut character_obj, string::utf8(b"Dobby is a free assistant who helps because of his enormous heart."));
        let character = object::borrow(&character_obj);
        assert!(*get_description(character) == string::utf8(b"Dobby is a free assistant who helps because of his enormous heart."), 6);

        // Test update_instructions
        update_instructions(&mut character_obj, string::utf8(b"System architecture"));
        let character = object::borrow(&character_obj);
        assert!(*get_instructions(character) == string::utf8(b"System architecture"), 7);

        // Clean up
        destroy_character(character_obj);
    }

}
