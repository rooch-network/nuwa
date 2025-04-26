/**
 * Twitter Adapter Module
 * 
 * This module adapts the data received from twitterService (which interacts with the specific, potentially non-standard API)
 * into a more standardized format, potentially aligning closer to official Twitter API v2 structures or simply providing
 * a cleaner, simplified interface for consumers like AI tools.
 */

import * as twitterService from './twitterService';

// --- Standardized/Simplified Data Structures ---

export interface StandardUserPublicMetrics {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number; // Note: May not be available in underlying service
}

export interface StandardUser {
    id: string;
    name: string; // Display name
    username: string; // Screen name / handle (e.g., @username)
    created_at?: string; // ISO 8601 format preferred
    description?: string;
    location?: string;
    profile_image_url?: string;
    protected?: boolean;
    public_metrics?: StandardUserPublicMetrics;
    url?: string; // User's website URL from bio entities
    verified?: boolean; // Consolidated verification status
}

export interface StandardTweetPublicMetrics {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count: number; // Note: Provided as 0 in examples, might not be accurate
    impression_count: number; // viewCount
}

export interface StandardTweetMentionEntity {
    id: string; // User ID
    username: string; // Screen name
}

export interface StandardTweetUrlEntity {
    url: string; // t.co URL
    expanded_url: string;
    display_url: string;
}

export interface StandardTweetHashtagEntity {
    tag: string;
}

export interface StandardTweetEntities {
    mentions?: StandardTweetMentionEntity[];
    urls?: StandardTweetUrlEntity[];
    hashtags?: StandardTweetHashtagEntity[];
}

export interface StandardReferencedTweet {
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
}

// New structure for embedding author info directly in the tweet
export interface StandardTweetAuthor {
    id: string;
    name: string;
    username: string;
}

export interface StandardTweet {
    id: string;
    text: string;
    author: StandardTweetAuthor; // Use the new author structure
    conversation_id?: string;
    created_at?: string; // ISO 8601 format preferred
    entities?: StandardTweetEntities;
    in_reply_to_user_id?: string;
    lang?: string;
    public_metrics?: StandardTweetPublicMetrics;
    possibly_sensitive?: boolean;
    referenced_tweets?: StandardReferencedTweet[];
    source?: string; 
}

// --- Conversion Functions ---

/**
 * Converts the detailed user info from twitterService into StandardUser format.
 */
function convertToStandardUserDetailed(user: twitterService.TwitterUserInfoDetailed | null | undefined): StandardUser | null {
    if (!user) return null;

    const username = user.userName; // Detailed uses userName
    if (!username) {
        console.warn("Detailed User object missing userName, cannot create StandardUser:", user);
        return null;
    }

    const metrics: StandardUserPublicMetrics = {
        followers_count: user.followers ?? 0,
        following_count: user.following ?? 0,
        tweet_count: user.statusesCount ?? 0,
        listed_count: 0 // Placeholder
    };

    let websiteUrl: string | undefined;
    if (user.profile_bio?.entities?.url?.urls?.[0]) {
        websiteUrl = user.profile_bio.entities.url.urls[0].expanded_url;
    }

    const standardCreatedAt: string | undefined = user.createdAt; // Use const as it's not reassigned

    return {
        id: user.id,
        name: user.name,
        username: username,
        created_at: standardCreatedAt,
        description: user.description,
        location: user.location,
        profile_image_url: user.profilePicture,
        protected: user.protected ?? false,
        public_metrics: metrics,
        url: websiteUrl,
        verified: user.isBlueVerified ?? false, // Detailed uses isBlueVerified
    };
}

/**
 * Converts the list item user info (snake_case) from twitterService into StandardUser format.
 * Used for followers/followings.
 */
function convertToStandardUserListItem(user: twitterService.TwitterUserListItem | null | undefined): StandardUser | null {
    if (!user) return null;

    const username = user.screen_name; // List item uses screen_name (snake_case)
    if (!username) {
        console.warn("List Item User object missing screen_name, cannot create StandardUser:", user);
        return null;
    }

    const metrics: StandardUserPublicMetrics = {
        followers_count: user.followers_count ?? 0,
        following_count: user.following_count ?? user.friends_count ?? 0, 
        tweet_count: user.statuses_count ?? 0,
        listed_count: 0 // Placeholder
    };

    let standardCreatedAt: string | undefined;
    if (user.created_at) { // List item uses created_at (Twitter format)
        try {
            standardCreatedAt = new Date(user.created_at).toISOString();
        } catch (e) {
            console.warn(`Failed to parse date string: ${user.created_at}`, e);
            standardCreatedAt = user.created_at; // Fallback
        }
    }

    return {
        id: user.id,
        name: user.name,
        username: username,
        created_at: standardCreatedAt,
        description: user.description,
        location: user.location,
        profile_image_url: user.profile_image_url_https, // List item uses profile_image_url_https
        protected: user.protected ?? false,
        public_metrics: metrics,
        url: user.url ?? undefined, // Convert null to undefined
        verified: user.verified ?? false, // List item uses verified
    };
}

/**
 * Converts the retweeter user info (camelCase) from twitterService into StandardUser format.
 * Used for retweeters.
 */
function convertToStandardRetweeterUser(user: twitterService.TwitterRetweeterUser | null | undefined): StandardUser | null {
    if (!user) return null;

    const username = user.userName; // Retweeter uses userName (camelCase)
    if (!username) {
        console.warn("Retweeter User object missing userName, cannot create StandardUser:", user);
        return null;
    }

    const metrics: StandardUserPublicMetrics = {
        followers_count: user.followers ?? 0, // Retweeter uses followers
        following_count: user.following ?? 0, // Retweeter uses following
        tweet_count: user.statusesCount ?? 0, // Retweeter uses statusesCount
        listed_count: 0 // Placeholder
    };

    const standardCreatedAt: string | undefined = user.createdAt; // Use const

    return {
        id: user.id,
        name: user.name,
        username: username,
        created_at: standardCreatedAt,
        description: user.description,
        location: user.location,
        profile_image_url: user.profilePicture, // Retweeter uses profilePicture
        protected: user.protected ?? false,
        public_metrics: metrics,
        url: user.url ?? undefined, // Convert null to undefined
        verified: user.verified ?? false, // Retweeter uses verified
    };
}

/**
 * Converts the detailed or mention tweet info from twitterService into StandardTweet format.
 */
function convertToStandardTweet(tweet: twitterService.TweetDetailed | twitterService.TweetMention | null | undefined): StandardTweet | null {
    if (!tweet) return null;

    let standardAuthor: StandardUser | null = null;
    if (tweet.author) {
        if ('userName' in tweet.author && 'profile_bio' in tweet.author) { 
            standardAuthor = convertToStandardUserDetailed(tweet.author as twitterService.TwitterUserInfoDetailed);
        } else if ('userName' in tweet.author) { 
             standardAuthor = convertToStandardUserDetailed(tweet.author as twitterService.TwitterUserInfoDetailed); 
        } else if ('screen_name' in tweet.author) { 
            standardAuthor = convertToStandardUserListItem(tweet.author as twitterService.TwitterUserListItem);
        } else if ('id' in tweet.author) {
             console.warn("Tweet author has minimal info, cannot fully convert to StandardUser:", tweet.author);
             return null; 
        }
    }

    if (!standardAuthor) {
        console.warn("Could not convert author within tweet, skipping tweet conversion:", tweet.id);
        return null;
    }

    // Create the StandardTweetAuthor object
    const tweetAuthor: StandardTweetAuthor = {
        id: standardAuthor.id,
        name: standardAuthor.name, // Already validated in StandardUser conversion
        username: standardAuthor.username, // Already validated in StandardUser conversion
    };

    const metrics: StandardTweetPublicMetrics = {
        retweet_count: tweet.retweetCount ?? 0,
        reply_count: tweet.replyCount ?? 0,
        like_count: tweet.likeCount ?? 0,
        quote_count: tweet.quoteCount ?? 0,
        bookmark_count: tweet.bookmarkCount ?? 0,
        impression_count: tweet.viewCount ?? 0,
    };

    const entities: StandardTweetEntities = {};
    if (tweet.entities && typeof tweet.entities === 'object') {
        const tweetEntities = tweet.entities as twitterService.TweetMentionEntities; 
        if (tweetEntities.user_mentions?.length) {
            entities.mentions = tweetEntities.user_mentions.map((m) => ({ id: m.id_str, username: m.screen_name }));
        }
        if (tweetEntities.urls?.length) {
            entities.urls = tweetEntities.urls.map((u) => ({ url: u.url, expanded_url: u.expanded_url, display_url: u.display_url }));
        }
        if (tweetEntities.hashtags?.length) {
            entities.hashtags = tweetEntities.hashtags.map((h) => ({ tag: h.text }));
        }
    }

    const referenced_tweets: StandardReferencedTweet[] = [];
    if (tweet.isReply && tweet.inReplyToId) {
        referenced_tweets.push({ type: 'replied_to', id: tweet.inReplyToId });
    }
    if ('isQuote' in tweet && tweet.isQuote && tweet.quoted_tweet?.id) {
        referenced_tweets.push({ type: 'quoted', id: tweet.quoted_tweet.id });
    }
    if ('isRetweet' in tweet && tweet.isRetweet && tweet.retweeted_tweet?.id) {
        referenced_tweets.push({ type: 'retweeted', id: tweet.retweeted_tweet.id });
    }

    let standardCreatedAt: string | undefined;
    if (tweet.createdAt) {
        try {
             standardCreatedAt = new Date(tweet.createdAt).toISOString();
        } catch (e) {
            console.warn(`Failed to parse date string: ${tweet.createdAt}`, e);
            standardCreatedAt = tweet.createdAt; 
        }
    }

    return {
        id: tweet.id,
        text: tweet.text,
        author: tweetAuthor, // Use the created author object
        conversation_id: tweet.conversationId,
        created_at: standardCreatedAt,
        entities: Object.keys(entities).length > 0 ? entities : undefined,
        in_reply_to_user_id: tweet.inReplyToUserId ?? undefined,
        lang: tweet.lang,
        public_metrics: metrics,
        possibly_sensitive: tweet.possiblySensitive ?? false, 
        referenced_tweets: referenced_tweets.length > 0 ? referenced_tweets : undefined,
        source: tweet.source,
    };
}

// --- Exported Adapter Functions --- Updated calls & Return Types --- 

/**
 * Gets information about multiple Twitter users by their IDs, adapted to StandardUser format.
 */
export async function getStandardUsersByIds(userIds: string): Promise<{ users: StandardUser[] }> {
    try {
        const response = await twitterService.batchGetUsers(userIds);
        // response.users contains TwitterUserInfoDetailed[]
        const standardUsers = (response.users || [])
            .map(convertToStandardUserDetailed) // Use Detailed converter
            .filter((u): u is StandardUser => u !== null);
        return { users: standardUsers };
    } catch (error) {
        console.error(`Adapter error fetching batch users by IDs:`, error);
        throw error;
    }
}

/**
 * Gets a single tweet by ID, adapted to StandardTweet format.
 * (No pagination needed for this one)
 */
export async function getStandardTweetById(tweetId: string): Promise<StandardTweet | null> {
    try {
        const response = await twitterService.getTweetsByIds(tweetId);
        if (!response.tweets || response.tweets.length === 0) {
            console.log(`Tweet not found via twitterService for ID: ${tweetId}`);
            return null;
        }
        return convertToStandardTweet(response.tweets[0]); 
    } catch (error) {
        console.error(`Adapter error fetching tweet ${tweetId}:`, error);
        throw error; 
    }
}

/**
 * Gets user info by username, adapted to StandardUser format.
 * (No pagination needed for this one)
 */
export async function getStandardUserByUsername(username: string): Promise<StandardUser | null> {
    try {
        const response = await twitterService.getUserByUsername(username);
        if (!response.data) {
            console.log(`User not found via twitterService for username: ${username}`);
            return null;
        }
        return convertToStandardUserDetailed(response.data);
    } catch (error) {
        console.error(`Adapter error fetching user ${username}:`, error);
        throw error; 
    }
}

/**
 * Gets user followers, adapted to StandardUser format.
 */
export async function getStandardUserFollowers(username: string, cursor?: string): Promise<{ users: StandardUser[], next_cursor?: string, has_next_page?: boolean }> {
    try {
        const response = await twitterService.getUserFollowers(username, cursor || "");
        const standardUsers = (response.followers || [])
            .map(convertToStandardUserListItem) 
            .filter((u): u is StandardUser => u !== null); 
        return { 
            users: standardUsers, 
            next_cursor: response.next_cursor, 
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching followers for ${username}:`, error);
        throw error;
    }
}

/**
 * Gets user followings, adapted to StandardUser format.
 */
export async function getStandardUserFollowings(username: string, cursor?: string): Promise<{ users: StandardUser[], next_cursor?: string, has_next_page?: boolean }> {
     try {
        const response = await twitterService.getUserFollowings(username, cursor || "");
        const standardUsers = (response.followings || [])
            .map(convertToStandardUserListItem) 
            .filter((u): u is StandardUser => u !== null); 
        return { 
            users: standardUsers, 
            next_cursor: response.next_cursor, 
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching followings for ${username}:`, error);
        throw error;
    }
}

/**
 * Gets latest tweets for a user, adapted to StandardTweet format.
 */
export async function getStandardUserLastTweets(username: string, cursor?: string): Promise<{ tweets: StandardTweet[], next_cursor?: string, has_next_page?: boolean }> {
    try {
        const response = await twitterService.getUserLastTweets(username, cursor || "");
        const standardTweets = (response.tweets || [])
            .map(convertToStandardTweet) 
            .filter((t): t is StandardTweet => t !== null);
        return { 
            tweets: standardTweets, 
            next_cursor: response.next_cursor, 
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching last tweets for ${username}:`, error);
        throw error;
    }
}

/**
 * Gets tweet mentions for a user, adapted to StandardTweet format.
 */
export async function getStandardUserMentions(username: string, sinceTime?: number, untilTime?: number, cursor?: string): Promise<{ tweets: StandardTweet[], next_cursor?: string, has_next_page?: boolean }> {
    try {
        const response = await twitterService.getUserMentions(username, sinceTime, untilTime, cursor || "");
        const standardTweets = (response.tweets || [])
            .map(convertToStandardTweet) 
            .filter((t): t is StandardTweet => t !== null);
        return {
            tweets: standardTweets,
            next_cursor: response.next_cursor,
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching mentions for ${username}:`, error);
        throw error;
    }
}

/**
 * Gets tweet replies by tweet ID, adapted to StandardTweet format.
 */
export async function getStandardTweetReplies(tweetId: string, sinceTime?: number, untilTime?: number, cursor?: string): Promise<{ replies: StandardTweet[], next_cursor?: string, has_next_page?: boolean }> {
     try {
        const response = await twitterService.getTweetReplies(tweetId, sinceTime, untilTime, cursor || "");
        const standardReplies = (response.replies || [])
            .map(convertToStandardTweet) 
            .filter((t): t is StandardTweet => t !== null);
        return {
            replies: standardReplies,
            next_cursor: response.next_cursor,
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching replies for tweet ${tweetId}:`, error);
        throw error;
    }
}

/**
 * Gets tweet quotes by tweet ID, adapted to StandardTweet format.
 */
export async function getStandardTweetQuotes(tweetId: string, sinceTime?: number, untilTime?: number, includeReplies: boolean = true, cursor?: string): Promise<{ tweets: StandardTweet[], next_cursor?: string, has_next_page?: boolean }> {
    try {
        const response = await twitterService.getTweetQuotes(tweetId, sinceTime, untilTime, includeReplies, cursor || "");
         const standardTweets = (response.tweets || [])
            .map(convertToStandardTweet) 
            .filter((t): t is StandardTweet => t !== null);
        return { 
            tweets: standardTweets, 
            next_cursor: response.next_cursor, 
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching quotes for tweet ${tweetId}:`, error);
        throw error;
    }
}

/**
 * Gets tweet retweeters by tweet ID, adapted to StandardUser format.
 */
export async function getStandardTweetRetweeters(tweetId: string, cursor?: string): Promise<{ users: StandardUser[], next_cursor?: string, has_next_page?: boolean }> {
    try {
        const response = await twitterService.getTweetRetweeters(tweetId, cursor || "");
         const standardUsers = (response.users || [])
            .map(convertToStandardRetweeterUser) 
            .filter((u): u is StandardUser => u !== null); 
        return { 
            users: standardUsers, 
            next_cursor: response.next_cursor, 
            has_next_page: response.has_next_page
        };
    } catch (error) {
        console.error(`Adapter error fetching retweeters for tweet ${tweetId}:`, error);
        throw error;
    }
}

/**
 * Internal helper function to check if a user follows a specific target user.
 * Handles pagination.
 * @param userName The user whose followings list is being checked.
 * @param targetUsername The screen name of the user to look for in the followings list.
 * @returns A promise resolving to true if the target is followed, false otherwise.
 */
async function _checkUserFollowsTarget(userName: string, targetUsername: string): Promise<boolean> {
    let cursor: string | undefined = undefined;
    let hasMorePages = true;
    const targetUsernameLower = targetUsername.toLowerCase();

    while (hasMorePages) {
        console.log(`Checking followings page for ${userName}, cursor: ${cursor}`);
        const response = await getStandardUserFollowings(userName, cursor);
        const standardUsers = response.users || [];
        
        const followsTarget = standardUsers.some(user => 
            user.username?.toLowerCase() === targetUsernameLower
        );
        if (followsTarget) {
            return true; 
        }

        cursor = response.next_cursor;
        hasMorePages = !!response.has_next_page && !!cursor;
        
        console.log(`Loop check: hasMorePages=${hasMorePages}, next_cursor=${cursor}`);
        
        if(hasMorePages) await new Promise(resolve => setTimeout(resolve, 200)); 
    }
    return false;
}

export async function checkUserFollowsTarget(userName: string, targetUsername: string): Promise<boolean> {
    try {
        return await _checkUserFollowsTarget(userName, targetUsername);
    } catch (error) {
        console.error(`Adapter error checking if ${userName} follows ${targetUsername}:`, error);
        throw new Error(`Failed to check if ${userName} follows ${targetUsername}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Checks if a user follows NuwaDev by fetching their followings.
 */
export async function checkUserFollowsNuwaDev(userName: string): Promise<{ followsNuwaDev: boolean, message?: string }> {
     try {
        const targetUsername = 'nuwadev'; 
        const follows = await checkUserFollowsTarget(userName, targetUsername);
        return {
            followsNuwaDev: follows,
            message: follows 
                ? `User ${userName} follows @${targetUsername}` 
                : `User ${userName} does not follow @${targetUsername}`
        };
    } catch (error) {
        console.error(`Adapter error checking follow status for ${userName} -> ${'nuwadev'}:`, error);
         throw new Error(`Failed to check if ${userName} follows ${'nuwadev'}: ${error instanceof Error ? error.message : String(error)}`);
    } 
} 