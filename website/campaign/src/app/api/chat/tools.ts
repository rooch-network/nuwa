import { tool } from 'ai';
import { z } from 'zod';
import {
    rewardUserPoints,
    checkUserRewardHistory,
    deductUserPoints,
    getUserPointsByHandle,
    addTweetScore,
    checkTweetExists
} from '@/app/services/supabaseService';
import { getTweetScore } from './scoring-agent';
import * as twitterAdapter from '@/app/services/twitterAdapter';

export const tools = {

    // --- Twitter Tools (now wrappers around twitterAdapter) ---

    // 1. 批量获取用户信息
    twitterBatchGetUsers: tool({
        description: 'Get information about multiple Twitter users by their user IDs in a standardized format',
        parameters: z.object({
            userIds: z.string().describe('Comma-separated list of Twitter user IDs'),
        }),
        // Call the adapter function
        // execute: async ({ userIds }) => twitterService.batchGetUsers(userIds), // Old call
        execute: async ({ userIds }) => twitterAdapter.getStandardUsersByIds(userIds), // Use adapter
    }),

    // 2. 通过用户名获取用户信息
    twitterGetUserByUsername: tool({
        description: 'Get information about a Twitter user by username in a standardized format',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get information for'),
        }),
        // Call the adapter function
        execute: async ({ userName }) => twitterAdapter.getStandardUserByUsername(userName),
    }),

    // 3. 获取用户最新推文
    twitterGetUserLastTweets: tool({
        description: 'Retrieve latest tweets by user name (excluding replies) in a standardized format. Results paginated.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get tweets from'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
        // Call the adapter function
        execute: async ({ userName, cursor }) => twitterAdapter.getStandardUserLastTweets(userName, cursor),
    }),

    // 4. 获取用户关注者
    twitterGetUserFollowers: tool({
        description: 'Get user followers in a standardized format (newest first). Results paginated.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
        // Call the adapter function
        execute: async ({ userName, cursor }) => twitterAdapter.getStandardUserFollowers(userName, cursor),
    }),

    // 5. 获取用户关注的人
    twitterGetUserFollowings: tool({
        description: 'Get user followings in a standardized format. Results paginated.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
        // Call the adapter function
        execute: async ({ userName, cursor }) => twitterAdapter.getStandardUserFollowings(userName, cursor),
    }),

    // 6. 获取用户提及
    twitterGetUserMentions: tool({
        description: 'Get tweet mentions for a user in a standardized format (newest first). Results paginated.',
        parameters: z.object({
            userName: z.string().describe('The user screen name'),
            sinceTime: z.number().optional().describe('Unix timestamp (seconds)'),
            untilTime: z.number().optional().describe('Unix timestamp (seconds)'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
        // Call the adapter function
        execute: async ({ userName, sinceTime, untilTime, cursor }) => 
            twitterAdapter.getStandardUserMentions(userName, sinceTime, untilTime, cursor),
    }),

    // 7. 通过ID获取推文
    twitterGetTweetsByIds: tool({
        description: 'Get a single tweet by its ID in a standardized format.',
        parameters: z.object({
            // tweet_ids: z.string().describe('A single tweet ID.'), // Renamed parameter
            tweetId: z.string().describe('A single tweet ID.'), 
        }),
         // Call the adapter function, handle potential null return
        execute: async ({ tweetId }) => {
            const tweet = await twitterAdapter.getStandardTweetById(tweetId); // Use adapter
            if (!tweet) {
                // Return an error structure if tweet not found
                return { error: 'Tweet not found', message: `Tweet with ID ${tweetId} could not be fetched or does not exist.` };
            }
            return tweet; // Return StandardTweet
        },
    }),

    // 8. 获取推文回复
    twitterGetTweetReplies: tool({
        description: 'Get tweet replies by tweet ID in a standardized format (newest first). Results paginated.',
        parameters: z.object({
            tweetId: z.string().describe('The original tweet ID'),
            sinceTime: z.number().optional().describe('Unix timestamp (seconds)'),
            untilTime: z.number().optional().describe('Unix timestamp (seconds)'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
         // Call the adapter function
        execute: async ({ tweetId, sinceTime, untilTime, cursor }) => 
            twitterAdapter.getStandardTweetReplies(tweetId, sinceTime, untilTime, cursor),
    }),

    // 9. 获取推文引用
    twitterGetTweetQuotes: tool({
        description: 'Get tweet quotes by tweet ID in a standardized format (newest first). Results paginated.',
        parameters: z.object({
            tweetId: z.string().describe('The tweet ID'),
            sinceTime: z.number().optional().describe('Unix timestamp (seconds)'),
            untilTime: z.number().optional().describe('Unix timestamp (seconds)'),
            includeReplies: z.boolean().optional().default(true).describe('Include replies?'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
         // Call the adapter function
        execute: async ({ tweetId, sinceTime, untilTime, includeReplies, cursor }) => 
            twitterAdapter.getStandardTweetQuotes(tweetId, sinceTime, untilTime, includeReplies, cursor),
    }),

    // 10. 获取推文转发者
    twitterGetTweetRetweeters: tool({
        description: 'Get tweet retweeters by tweet ID in a standardized format. Results paginated.',
        parameters: z.object({
            tweetId: z.string().describe('The tweet ID'),
            cursor: z.string().optional().describe('Pagination cursor'),
        }),
        // Call the adapter function
        execute: async ({ tweetId, cursor }) => twitterAdapter.getStandardTweetRetweeters(tweetId, cursor),
    }),

    // --- Other Tools ---
    
    // 11. 奖励用户代币 (No change)
    rewardUserPoints: tool({
        description: 'Reward points to a user for completing a mission',
        parameters: z.object({
            userName: z.string().describe('The username of the reward receiver'),
            points: z.number().describe('The amount of points to be rewarded'),
            missionId: z.string().describe('The id of the mission that was completed'),
            missionDetails: z.string().optional().describe('Additional details about the completed mission'),
        }),
        execute: async ({ userName, points, missionId, missionDetails }) => {
            try {
                 await rewardUserPoints({ userName, points, missionId, missionDetails });
                 return { success: true, message: `Successfully rewarded ${points} points to ${userName}.` };
            } catch (error) {
                 console.error('Error in rewardUserPoints tool:', error);
                 return { success: false, message: `Failed to reward points: ${error instanceof Error ? error.message : String(error)}` };
            }
        },
    }),

    // 12. 检查用户是否已经从特定任务获得过奖励 (No change in call, added try-catch)
    checkUserRewardHistory: tool({
        description: 'Check if a user has already received rewards for a specific mission',
        parameters: z.object({
            userName: z.string().describe('The username to check'),
            mission: z.string().describe('The mission to check'),
        }),
        execute: async ({ userName, mission }) => {
             // Call the function from supabaseService
             // No try-catch needed here as checkUserRewardHistory in service returns object, doesn't throw
             // Re-check supabaseService: checkUserRewardHistory does NOT throw, it returns object. OK.
            return checkUserRewardHistory({ userName, mission });
        },
    }),

    // 13. 扣除用户积分 (No change in call, added try-catch)
    deductUserPoints: tool({
        description: 'Deduct points from a user',
        parameters: z.object({
            userName: z.string().describe('The username of the user to deduct points from'),
            points: z.number().describe('The amount of points to be deducted (positive number)'),
            missionId: z.string().describe('The id of the mission that is deducting the points'),
            missionDetails: z.string().optional().describe('Additional details about why points are being deducted'),
        }),
        execute: async ({ userName, points, missionId, missionDetails }) => {
            // Call the function from supabaseService
             try {
                 await deductUserPoints({ userName, points, missionId, missionDetails });
                 return { success: true, message: `Successfully deducted ${points} points from ${userName}.` };
            } catch (error) {
                 console.error('Error in deductUserPoints tool:', error);
                 return { success: false, message: `Failed to deduct points: ${error instanceof Error ? error.message : String(error)}` };
            }
        },
    }),

    // 14. 生成随机数 (No change)
    generateRandomNumber: tool({
        description: 'Generate a random integer between 0 and 100',
        parameters: z.object({}),
        execute: async () => {
            try {
                // 生成0到100之间的随机整数
                const randomNumber = Math.floor(Math.random() * 101);
                return randomNumber;
            } catch (error) {
                return {
                    error: `Error generating random number: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        },
    }),

    // 15. 获取用户当前积分 (No change, already handles errors)
    getUserCurrentPoints: tool({
        description: 'Get the current points of a user from the Campaign Points table. Returns an object with points and potentially error/message fields.',
        parameters: z.object({
            userName: z.string().describe('The username to get points for'),
        }),
        execute: async ({ userName }) => {
            try {
                const points = await getUserPointsByHandle(userName);
                return {
                    points: points,
                    message: `User ${userName} has ${points} points.`
                 };
            } catch (error) {
                console.error(`Tool Error: Failed to get points for ${userName}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    points: 0,
                    error: errorMessage,
                };
            }
        },
    }),

    // 16. 检查用户是否关注了NuwaDev
    checkUserFollowsNuwaDev: tool({
        description: 'Check if a user follows the NuwaDev Twitter account',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to check if they follow NuwaDev'),
        }),
        // Call the adapter function
        execute: async ({ userName }) => {
             try {
                // return await twitterService.checkUserFollowsNuwaDev(userName); // Old call
                return await twitterAdapter.checkUserFollowsNuwaDev(userName); // Use adapter
            } catch (error) {
                 console.error(`Error in checkUserFollowsNuwaDev tool for ${userName}:`, error);
                 // Return error structure consistent with the service function's potential errors
                 return { 
                     followsNuwaDev: false, 
                     error: `Failed to check follow status: ${error instanceof Error ? error.message : String(error)}` 
                 };
            }
        }
    }),

    // 17. 发送推文内容到Twitter卡片 (No change)
    sendPostToTwitterCard: tool({
        description: 'Create a Twitter card preview with content and optional image URL',
        parameters: z.object({
            content: z.string().describe('The content of the tweet to be displayed'),
            imageUrl: z.string().optional().describe('URL of an image to include in the tweet (optional)'),
        }),
        execute: async ({ content, imageUrl }) => {
            try {
                return {
                    success: true,
                    content,
                    imageUrl
                };
            } catch (error) {
                return {
                    success: false,
                    error: `Error creating Twitter card: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        },
    }),

    // 18. Score a tweet using the scoring agent and save to database
    scoreTweet: tool({
        description: 'Fetches tweet data using the tweet ID, analyzes it based on predefined criteria, assigns a score (0-100), and saves the result. Checks if the tweet has already been scored.',
        parameters: z.object({
            tweetId: z.string().describe('The unique identifier of the tweet to be scored.'),
        }),
        execute: async function ({ tweetId }) { 
            try {
                // 1. Check if the tweet has already been scored (from supabaseService)
                const exists = await checkTweetExists(tweetId);
                if (exists) {
                    return {
                        success: false, 
                        message: `Tweet ${tweetId} has already been scored. No action taken.`,
                        score: null, 
                        reasoning: null
                    };
                }

                // 2. Fetch tweet data using twitterAdapter
                console.log(`Fetching standardized tweet data for ${tweetId}...`);
                // const tweetDataToUse = await twitterService.getTweetsByIds(tweetId); // Old call
                const standardTweet = await twitterAdapter.getStandardTweetById(tweetId); // Use adapter
                
                if (!standardTweet) {
                    throw new Error(`Standard tweet data not found for ID ${tweetId} via twitterAdapter.`);
                }
                // 3. Get the score from the scoring agent 
                // Pass StandardTweet to scoring agent
                const { score, reasoning } = await getTweetScore(standardTweet);

                // 4. Save the score to the database (TODO: Verify addTweetScore accepts StandardTweet)
                await addTweetScore(tweetId, standardTweet, score);

                // 5. Return the result
                return {
                    success: true,
                    message: `Tweet ${tweetId} successfully scored and saved. Score: ${score}/100.`, 
                    score: score,
                    reasoning: reasoning
                };

            } catch (error) {
                console.error(`Error in scoreTweet tool for tweet ID ${tweetId}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    message: `Failed to score or save tweet ${tweetId}: ${errorMessage}`,
                    score: null,
                    reasoning: null,
                    error: errorMessage
                };
            }
        },
    }),
}; 