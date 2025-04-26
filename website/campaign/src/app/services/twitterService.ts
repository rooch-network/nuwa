// Removed @ts-nocheck as specific types are now defined
// TODO: Define specific types for API responses within callTwitterApi if possible

/**
 * Twitter Service Module
 * 
 * Encapsulates logic for interacting with the Twitter API.
 */

// Define interfaces for better type safety (Copied from tools.ts)
export interface RawTweetEntities {
    urls?: { 
        url: {
            start: number;
            end: number;
            url: string;
            expanded_url: string;
            display_url: string;
        };
    }[];
    mentions?: {
        start: number;
        end: number;
        username: string;
        id: string;
    }[];
    hashtags?: {
        start: number;
        end: number;
        tag: string;
    }[];
    cashtags?: {
        start: number;
        end: number;
        tag: string;
    }[];
}

// Non-exported RawTweet interface (only used internally by optimizeTweetsData)
interface RawTweet {
    id: string;
    author: { userName: string };
    text: string;
    note_tweet?: string | null;
    entities?: RawTweetEntities;
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
}

export interface OptimizedTweet {
    id: string;
    author: string;
    text: string;
    entities?: RawTweetEntities;
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
    isPinned?: boolean;
}

// --- Base Interfaces (Entities, URLs etc. - Reusable) ---

// Interfaces for nested URL structures within entities
interface UrlDetail {
    display_url: string;
    expanded_url: string;
    indices: number[];
    url: string;
}

interface DescriptionEntities {
    urls: UrlDetail[];
}

interface UrlEntities {
    urls: UrlDetail[];
}

// Interface for the nested entities within profile_bio
interface ProfileBioEntities {
    description: DescriptionEntities;
    url: UrlEntities;
}

// Interface for the profile_bio object (Primarily in Detailed Info)
interface ProfileBio {
    description: string;
    entities: ProfileBioEntities;
}

// --- Specific User Info Structures ---

// 1. Detailed User Info (from user/info, user/batch_info_by_ids, tweet author)
export interface TwitterUserInfoDetailed {
    id: string;
    name: string;
    userName: string; 
    screen_name?: string; 
    location?: string; 
    url?: string; // t.co link in bio
    twitterUrl?: string; // Add twitterUrl based on examples
    description: string;
    protected?: boolean; 
    isVerified?: boolean; // Might be deprecated / less used
    isBlueVerified: boolean;
    followers: number; 
    following: number; 
    favouritesCount: number; 
    statusesCount: number; 
    mediaCount: number; 
    createdAt: string; 
    coverPicture?: string | null;
    profilePicture: string; 
    canDm: boolean;
    // Fields specifically seen in tweet author sub-object
    status?: string;                   
    canMediaTag?: boolean;             
    entities?: ProfileBioEntities & { description?: { user_mentions?: unknown[] } }; // Extend ProfileBioEntities slightly for author object
    // --- Fields primarily in user/info or batch --- (keep as optional)
    fastFollowersCount?: number; 
    hasCustomTimelines?: boolean; 
    isTranslator?: boolean; 
    withheldInCountries?: string[];
    affiliatesHighlightedLabel?: Record<string, unknown>; 
    possiblySensitive?: boolean;
    pinnedTweetIds?: string[]; 
    isAutomated?: boolean; 
    automatedBy?: string | null; 
    unavailable?: boolean; 
    message?: string; 
    unavailableReason?: string; 
    profile_bio?: ProfileBio | null; 
    type?: "user"; 
}

// 2. User Info as List Item (FOR /user/followers and /user/followings)
// Reverted to original snake_case definition
export interface TwitterUserListItem {
    id: string;
    name: string;
    screen_name: string; // Snake case
    location?: string; 
    url?: string | null; 
    description?: string;
    email?: string | null; // Present in followers
    protected: boolean;
    verified: boolean; // Snake case
    followers_count: number; // Snake case
    following_count: number; // Snake case
    friends_count?: number; // Snake case
    favourites_count: number; // Snake case
    statuses_count: number; // Snake case
    media_tweets_count?: number; // Snake case
    created_at: string; // Twitter date string format
    profile_banner_url?: string | null; // Snake case
    profile_image_url_https: string; // Snake case
    can_dm: boolean; // Snake case
}

// 3. User Info for Retweeters (FOR /tweet/retweeters)
// New interface based on observed camelCase structure
export interface TwitterRetweeterUser {
    id: string;
    name: string;
    userName: string; // Camel case
    location?: string; 
    url?: string | null;
    description?: string;
    protected: boolean;
    verified: boolean; // Camel case (same name, different context)
    followers: number; // Camel case
    following: number; // Camel case
    favouritesCount: number; // Camel case
    statusesCount: number; // Camel case
    mediaCount: number; // Camel case
    createdAt: string; // ISO 8601 format
    coverPicture?: string | null; // Camel case
    profilePicture: string; // Camel case
    canDm: boolean; // Camel case
}

// --- API Response Interfaces --- Corrected based on actual responses ---

// Interface for the root batch users response object
export interface BatchUsersResponse {
    users: TwitterUserInfoDetailed[]; 
    status: "success" | string; 
    msg: string;
}

// Interface for the user/info endpoint response
export interface UserInfoResponse {
    data: TwitterUserInfoDetailed; 
    status: "success" | string;
    msg: string;
}

// Interface for the user/followers endpoint response
export interface FollowersResponse {
    followers: TwitterUserListItem[]; // Uses snake_case List Item info
    status: "success" | string;
    msg: string; 
    next_cursor?: string; 
    has_next_page?: boolean;
    code?: number; 
}

// Interface for the user/followings endpoint response
export interface FollowingsResponse {
    followings: TwitterUserListItem[]; // Assumes snake_case List Item info (like followers)
    has_next_page?: boolean;
    next_cursor?: string;     
    status: "success" | string;
    msg?: string; 
    code?: number; 
}

// --- Interfaces for user/mentions response ---

export interface TweetMentionEntityHashtag {
    indices: number[];
    text: string;
}

export interface TweetMentionEntityUrl {
    display_url: string;
    expanded_url: string;
    indices: number[];
    url: string;
}

export interface TweetMentionEntityUserMention {
    id_str: string; // Note: API uses id_str here
    indices?: number[]; // Not shown in example, but often present
    name: string;
    screen_name: string;
}

export interface TweetMentionEntities {
    hashtags?: TweetMentionEntityHashtag[];
    urls?: TweetMentionEntityUrl[];
    user_mentions?: TweetMentionEntityUserMention[];
    // Add other potential entities like media if needed
}

// Define a simple stub for referenced tweets within mentions/replies/quotes
interface ReferencedTweetStub {
    id: string;
    // Potentially add other minimal fields if needed later
}

// Interface for a single tweet object within the mentions response
export interface TweetMention {
    type: "tweet";
    id: string;
    url: string;
    text: string;
    source?: string; // Optional
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
    createdAt: string; // Could be Date if parsed
    lang?: string; // Optional
    bookmarkCount?: number; // Optional
    isReply?: boolean; // Optional
    inReplyToId?: string | null; // Optional
    conversationId?: string; // Optional
    inReplyToUserId?: string | null; // Optional
    inReplyToUsername?: string | null; // Optional
    author: TwitterUserInfoDetailed | TwitterUserListItem | { id: string, userName?: string, screen_name?: string }; // Make author flexible or decide on one type
    entities?: TweetMentionEntities; // Use the specific mention entities
    isQuote?: boolean;
    isRetweet?: boolean;
    quoted_tweet?: ReferencedTweetStub | null;
    retweeted_tweet?: ReferencedTweetStub | null;
    possiblySensitive?: boolean;
}

// Interface for the root user/mentions response object
export interface UserMentionsResponse {
    tweets: TweetMention[];
    has_next_page?: boolean; 
    next_cursor?: string;    
    status: "success" | string;
    msg?: string; // Changed from message to msg
}

// Interface for the tweet/replies endpoint response
export interface TweetRepliesResponse {
    replies: TweetMention[]; // Reuse the tweet structure from mentions
    has_next_page?: boolean;
    next_cursor?: string;
    status: "success" | string;
    message?: string;
}

// Interface for the tweet/quotes endpoint response
export interface TweetQuotesResponse {
    tweets: TweetMention[];
    has_next_page?: boolean;
    next_cursor?: string;
    status: "success" | string;
    message?: string;
}

// Interface for the tweet/retweeters endpoint response
export interface TweetRetweetersResponse {
    users: TwitterRetweeterUser[]; // Uses camelCase Retweeter info
    has_next_page?: boolean;
    next_cursor?: string;
}

// --- Interfaces for Tweet Entities ---
interface TweetEntityHashtag {
    indices?: number[];
    text: string;
}

interface TweetEntityUrl {
    display_url: string;
    expanded_url: string;
    indices: number[];
    url: string;
}

interface TweetEntityUserMention {
    id_str: string;
    indices?: number[];
    name: string;
    screen_name: string;
}

interface TweetEntities {
    hashtags?: TweetEntityHashtag[];
    urls?: TweetEntityUrl[];
    user_mentions?: TweetEntityUserMention[];
    symbols?: unknown[]; 
    polls?: unknown[]; 
    media?: unknown[]; // Actual media details are in extendedEntities
}

// --- Interfaces for Extended Entities (Media) ---
// Basic structure, expand as needed
interface MediaEntity {
    id_str: string;
    indices: number[];
    media_url_https: string;
    type: 'photo' | 'video' | 'animated_gif';
    url: string; 
    display_url: string;
    expanded_url: string;
    // Add video_info, sizes, etc. if needed
}

interface ExtendedEntities {
    media: MediaEntity[];
}

// --- Main Detailed Tweet Interface ---
export interface TweetDetailed {
    type: "tweet";
    id: string;
    url: string;
    twitterUrl?: string; // Add twitterUrl based on example
    text: string;
    source?: string;
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
    createdAt: string; // Twitter date format
    lang?: string;
    bookmarkCount?: number;
    isReply?: boolean;
    inReplyToId?: string | null;
    conversationId?: string;
    inReplyToUserId?: string | null;
    inReplyToUsername?: string | null;
    isPinned?: boolean;
    author: TwitterUserInfoDetailed; 
    entities?: TweetEntities | object; 
    extendedEntities?: ExtendedEntities | object; 
    card?: object | null; // Allow null for card
    place?: object; 
    isRetweet?: boolean;
    isQuote?: boolean;
    isConversationControlled?: boolean;
    quoted_tweet?: TweetDetailed | null; // Recursive, optional
    retweeted_tweet?: TweetDetailed | null; // Recursive, optional
    possiblySensitive?: boolean;
}

// --- API Response Interfaces ---

// Update TweetsByIds response
export interface TweetsByIdsResponse {
    tweets: TweetDetailed[];
    status: "success" | string; 
    msg: string;
    code?: number; // Seen in example
}

// --- Core API Call Function (Copied from tools.ts) ---

/**
 * Generic function to call the Twitter API.
 * Handles API key and basic error handling.
 */
async function callTwitterApi(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = process.env.TWITTER_API_KEY;

    if (!apiKey) {
        console.error('Twitter API key is not configured');
        // Throw an error instead of returning an object for consistency
        throw new Error('Twitter API key is not configured'); 
    }

    try {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        const url = `https://api.twitterapi.io/twitter/${endpoint}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey },
        });

        const data = await response.json();

        if (!response.ok || data.status === "error") {
            const errorMessage = data.message || `HTTP ${response.status} ${response.statusText}`;
            //console.error(`Twitter API Error (${endpoint}): ${errorMessage}`);
            // Throw an error with details
            throw new Error(`Twitter API Error (${endpoint}): ${errorMessage}`);
        }
        return data; 
    } catch (error) {
        // Catch fetch errors or errors thrown from the response check
        //console.error(`Error calling Twitter API (${endpoint}):`, error);
        if (error instanceof Error && error.message.startsWith('Twitter API Error')) {
            throw error; // Re-throw specific API errors
        }
        throw new Error(`Failed to call Twitter API endpoint ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Exported Service Functions ---

/**
 * Get information about multiple Twitter users by their user IDs.
 * TODO: Define a specific return type instead of any.
 */
export async function batchGetUsers(userIds: string): Promise<BatchUsersResponse> {
    // Cast the result, assuming callTwitterApi returns data compatible with the interface
    return callTwitterApi('user/batch_info_by_ids', { userIds }) as Promise<BatchUsersResponse>;
}

/**
 * Get information about a Twitter user by username.
 * TODO: Define a specific return type instead of any.
 */
export async function getUserByUsername(userName: string): Promise<UserInfoResponse> {
    // Cast the result, assuming callTwitterApi returns data compatible with the interface
    return callTwitterApi('user/info', { userName }) as Promise<UserInfoResponse>;
}

/**
 * Retrieve latest tweets by user name (excluding replies).
 * Returns optimized tweet data and pagination info.
 */
export async function getUserLastTweets(userName: string, cursor: string = ""): Promise<{ tweets: TweetDetailed[], next_cursor?: string, has_next_page?: boolean }> {
    const response = await callTwitterApi('user/last_tweets', { userName, cursor });
    const data = response.data;
    // Return the raw tweets array from the response, assuming it matches TweetDetailed[]
    // TODO: Add runtime validation or safer casting if needed
    const tweets: TweetDetailed[] = data?.tweets || [];
    // Include pinned tweet if present and matches structure
    if (data?.pin_tweet) {
        tweets.unshift(data.pin_tweet as TweetDetailed); // Assuming pin_tweet matches TweetDetailed
    }
    return {
        tweets: tweets,
        next_cursor: response.next_cursor,
        has_next_page: response.has_next_page
    };
}

/**
 * Get user followers.
 * TODO: Define a specific return type instead of any.
 */
export async function getUserFollowers(userName: string, cursor: string = ""): Promise<FollowersResponse> {
    // Cast the result, assuming callTwitterApi returns data compatible with the interface
    return callTwitterApi('user/followers', { userName, cursor }) as Promise<FollowersResponse>;
}

/**
 * Get user followings.
 */
export async function getUserFollowings(userName: string, cursor: string = ""): Promise<FollowingsResponse> {
    // Cast the result, assuming callTwitterApi returns data compatible with the interface
    return callTwitterApi('user/followings', { userName, cursor }) as Promise<FollowingsResponse>;
}

/**
 * Get tweet mentions for a user.
 * TODO: Define a specific return type instead of any.
 */
export async function getUserMentions(userName: string, sinceTime?: number, untilTime?: number, cursor: string = ""): Promise<UserMentionsResponse> {
    const params: Record<string, string> = { userName };
    if (sinceTime) params.sinceTime = sinceTime.toString();
    if (untilTime) params.untilTime = untilTime.toString();
    if (cursor) params.cursor = cursor;
    return callTwitterApi('user/mentions', params) as Promise<UserMentionsResponse>;
}

/**
 * Get tweets by their IDs.
 * Returns the first optimized tweet data.
 */
export async function getTweetsByIds(tweet_ids: string): Promise<TweetsByIdsResponse> {
    // Remove optimizeTweetsData call, cast directly
    return callTwitterApi('tweets', { tweet_ids }) as Promise<TweetsByIdsResponse>;
}

/**
 * Get tweet replies by tweet ID.
 * TODO: Define a specific return type instead of any.
 */
export async function getTweetReplies(tweetId: string, sinceTime?: number, untilTime?: number, cursor: string = ""): Promise<TweetRepliesResponse> {
    const params: Record<string, string> = { tweetId };
    if (sinceTime) params.sinceTime = sinceTime.toString();
    if (untilTime) params.untilTime = untilTime.toString();
    if (cursor) params.cursor = cursor;
    return callTwitterApi('tweet/replies', params) as Promise<TweetRepliesResponse>;
}

/**
 * Get tweet quotes by tweet ID.
 */
export async function getTweetQuotes(tweetId: string, sinceTime?: number, untilTime?: number, includeReplies: boolean = true, cursor: string = ""): Promise<TweetQuotesResponse> {
    const params: Record<string, string> = { tweetId, includeReplies: includeReplies.toString() };
    if (sinceTime) params.sinceTime = sinceTime.toString();
    if (untilTime) params.untilTime = untilTime.toString();
    if (cursor) params.cursor = cursor;
    return callTwitterApi('tweet/quotes', params) as Promise<TweetQuotesResponse>;
}

/**
 * Get tweet retweeters by tweet ID.
 * TODO: Define a specific return type instead of any.
 */
export async function getTweetRetweeters(tweetId: string, cursor: string = ""): Promise<TweetRetweetersResponse> {
    const params: Record<string, string> = { tweetId };
    if (cursor) params.cursor = cursor;
    return callTwitterApi('tweet/retweeters', params) as Promise<TweetRetweetersResponse>;
}