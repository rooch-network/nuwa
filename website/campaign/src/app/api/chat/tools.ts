import { tool } from 'ai';
import { z } from 'zod';
import {
    rewardUserPoints,
    checkUserRewardHistory,
    deductUserPoints,
    getUserPointsByHandle
} from '@/app/services/supabaseService'; // Import Supabase functions

// Define interfaces for better type safety
interface RawTweetEntities {
    urls?: { // Assuming entities properties can be optional
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

interface RawTweet {
    id: string;
    author: { userName: string };
    text: string;
    note_tweet?: string | null; // Keep optional as per original logic
    entities?: RawTweetEntities; // Make entities optional in raw data for safety
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
}

interface OptimizedTweet {
    id: string;
    author: string;
    text: string;
    entities?: RawTweetEntities; // Include entities in the optimized type
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
    isPinned?: boolean; // Mark pinned tweet
}

// 通用Twitter API调用函数
async function callTwitterApi(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = process.env.TWITTER_API_KEY;

    if (!apiKey) {
        return {
            error: 'Twitter API key is not configured',
        };
    }

    try {
        // 构建URL，添加查询参数
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const url = `https://api.twitterapi.io/twitter/${endpoint}${queryString ? `?${queryString}` : ''}`;


        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
            },
        });

        const data = await response.json();

        if (!response.ok || data.status === "error") {
            const errorText = await data.message;
            return {
                error: `Failed to fetch Twitter data: ${response.status} ${response.statusText}`,
                details: errorText
            };
        }
        return data;
    } catch (error) {
        return {
            error: `Error fetching Twitter data: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

// 优化推文数据的工具函数
function optimizeTweetsData(tweets: RawTweet[], pinTweet?: RawTweet): OptimizedTweet[] {
    if (!tweets) return [];

    const optimizedTweets: OptimizedTweet[] = tweets.map((tweet: RawTweet) => ({
        id: tweet.id,
        author: tweet.author.userName,
        text: tweet.note_tweet ? tweet.note_tweet : tweet.text,
        entities: tweet.entities,
        retweetCount: tweet.retweetCount,
        replyCount: tweet.replyCount,
        likeCount: tweet.likeCount,
        quoteCount: tweet.quoteCount,
        viewCount: tweet.viewCount
    }));

    // 处理可能存在的 pin_tweet 对象
    if (pinTweet) {
        const pinTweetObj: OptimizedTweet = {
            id: pinTweet.id,
            author: pinTweet.author.userName,
            text: pinTweet.note_tweet ? pinTweet.note_tweet : pinTweet.text,
            entities: pinTweet.entities,
            retweetCount: pinTweet.retweetCount,
            replyCount: pinTweet.replyCount,
            likeCount: pinTweet.likeCount,
            quoteCount: pinTweet.quoteCount,
            viewCount: pinTweet.viewCount,
            isPinned: true // 添加标记表示这是置顶推文
        };
        optimizedTweets.unshift(pinTweetObj); // 将置顶推文添加到数组开头
    }

    return optimizedTweets;
}

export const tools = {

    // 1. 批量获取用户信息
    twitterBatchGetUsers: tool({
        description: 'Get information about multiple Twitter users by their user IDs',
        parameters: z.object({
            userIds: z.string().describe('Comma-separated list of Twitter user IDs'),
        }),
        execute: async ({ userIds }) => {
            return callTwitterApi('user/batch_info_by_ids', { userIds });
        },
    }),

    // 2. 通过用户名获取用户信息
    twitterGetUserByUsername: tool({
        description: 'Get information about a Twitter user by username',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get information for'),
        }),
        execute: async ({ userName }) => {
            return callTwitterApi('user/info', { userName });
        },
    }),

    // 3. 获取用户最新推文
    twitterGetUserLastTweets: tool({
        description: 'Retrieve tweets by user name.Sort by created_at. Results are paginated, with each page returning up to 20 tweets.This API will not return the tweets the user replied to. If you want to get the reply tweets, please use the advanced search API.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get tweets from'),
            cursor: z.string().optional().describe('Pagination cursor for retrieving more tweets'),
        }),
        execute: async ({ userName, cursor = "" }) => {
            const response = await callTwitterApi('user/last_tweets', {
                userName: userName,
                cursor: cursor
            });

            const data = response.data;

            // 如果API调用出错，直接返回错误信息
            if (response.status === "error") {
                return response.msg;
            }

            // 使用优化推文数据的工具函数
            if (data.tweets) {
                const optimizedTweets = optimizeTweetsData(data.tweets, data.pin_tweet);

                return {
                    tweets: optimizedTweets,
                    next_cursor: response.next_cursor,
                    has_next_page: response.has_next_page
                };
            }

            return response;
        },
    }),

    // 4. 获取用户关注者
    twitterGetUserFollowers: tool({
        description: 'Get user followers in reverse chronological order (newest first). Returns exactly 200 followers per page, sorted by follow date. Most recent followers appear on the first page. Use cursor for pagination through the complete followers list.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get followers for'),
            cursor: z.string().optional().describe('Pagination cursor for retrieving more followers'),
        }),
        execute: async ({ userName, cursor = "" }) => {
            return callTwitterApi('user/followers', {
                userName: userName,
                cursor: cursor
            });
        },
    }),

    // 5. 获取用户关注的人
    twitterGetUserFollowings: tool({
        description: 'Get user followings. Each page returns exactly 200 followings. Use cursor for pagination.',
        parameters: z.object({
            userName: z.string().describe('The Twitter username to get followings for'),
            cursor: z.string().optional().describe('Pagination cursor for retrieving more followings'),
        }),
        execute: async ({ userName, cursor = "" }) => {
            return callTwitterApi('user/followings', {
                userName: userName,
                cursor: cursor
            });
        },
    }),

    // 6. 获取用户提及
    twitterGetUserMentions: tool({
        description: 'get tweet mentions by user screen name.Each page returns exactly 20 mentions. Use cursor for pagination. Order by mention time desc',
        parameters: z.object({
            userName: z.string().describe('The user screen name to get mentions for'),
            sinceTime: z.number().optional().describe('On or after a specified unix timestamp in seconds'),
            untilTime: z.number().optional().describe('Before a specified unix timestamp in seconds'),
            cursor: z.string().optional().describe('The cursor to paginate through the results. First page is ""'),
        }),
        execute: async ({ userName, sinceTime, untilTime, cursor = "" }) => {
            const params: Record<string, string> = {
                userName
            };

            if (sinceTime) {
                params.sinceTime = sinceTime.toString();
            }

            if (untilTime) {
                params.untilTime = untilTime.toString();
            }

            if (cursor) {
                params.cursor = cursor;
            }

            return callTwitterApi('user/mentions', params);
        },
    }),

    // 7. 通过ID获取推文
    twitterGetTweetsByIds: tool({
        description: 'Get tweets by their IDs',
        parameters: z.object({
            tweet_ids: z.string().describe('Comma-separated list of tweet IDs'),
            current_user: z.string().optional().describe('The username of the current user to check tweet ownership (optional)'),
        }),
        execute: async ({ tweet_ids, current_user }) => {
            const response = await callTwitterApi('tweets', { tweet_ids });

            // 检查API调用是否返回错误
            if (response.error) {
                return response;
            }

            const optimizedTweets = optimizeTweetsData(response.tweets);

            // 只有当提供了 current_user 参数时才检查作者身份
            if (current_user && optimizedTweets && optimizedTweets.length > 0) {
                const firstTweet = optimizedTweets[0];

                if (firstTweet.author.toLowerCase() !== current_user.toLowerCase()) {
                    return {
                        error: 'Author does not match',
                        message: `The tweet is not authored by ${current_user}.`,
                        tweet: firstTweet
                    };
                }
            }

            return optimizedTweets[0];
        },
    }),

    // 8. 获取推文回复
    twitterGetTweetReplies: tool({
        description: 'get tweet replies by tweet id.Each page returns exactly 20 replies. Use cursor for pagination. Order by reply time desc',
        parameters: z.object({
            tweetId: z.string().describe('The tweet ID to get. Must be an original tweet (not a reply to another tweet) and should be the first tweet in a thread.'),
            sinceTime: z.number().optional().describe('On or after a specified unix timestamp in seconds'),
            untilTime: z.number().optional().describe('Before a specified unix timestamp in seconds'),
            cursor: z.string().optional().describe('The cursor to paginate through the results. First page is ""'),
        }),
        execute: async ({ tweetId, sinceTime, untilTime, cursor = "" }) => {
            const params: Record<string, string> = {
                tweetId,
            };

            if (sinceTime) {
                params.sinceTime = sinceTime.toString();
            }

            if (untilTime) {
                params.untilTime = untilTime.toString();
            }

            if (cursor) {
                params.cursor = cursor;
            }

            return callTwitterApi('tweet/replies', params);
        },
    }),

    // 9. 获取推文引用
    twitterGetTweetQuotes: tool({
        description: 'Get tweet quotes by tweet ID. Each page returns exactly 20 quotes. Use cursor for pagination. Order by quote time desc',
        parameters: z.object({
            tweetId: z.string().describe('The tweet ID to get. eg. 1846987139428634858'),
            sinceTime: z.number().optional().describe('On or after a specified unix timestamp in seconds'),
            untilTime: z.number().optional().describe('Before a specified unix timestamp in seconds'),
            includeReplies: z.boolean().optional().describe('Whether to include replies in the results. Default is True'),
            cursor: z.string().optional().describe('The cursor to paginate through the results. First page is ""'),
        }),
        execute: async ({ tweetId, sinceTime, untilTime, includeReplies = true, cursor = "" }) => {
            const params: Record<string, string> = {
                tweetId,
                includeReplies: includeReplies.toString()
            };

            if (sinceTime) {
                params.sinceTime = sinceTime.toString();
            }

            if (untilTime) {
                params.untilTime = untilTime.toString();
            }

            if (cursor) {
                params.cursor = cursor;
            }

            return callTwitterApi('tweet/quotes', params);
        },
    }),

    // 10. 获取推文转发者
    twitterGetTweetRetweeters: tool({
        description: 'get tweet retweeters by tweet id.Each page returns about 100 retweeters. Use cursor for pagination. Order by retweet time desc',
        parameters: z.object({
            tweetId: z.string().describe('The tweet ID to get. eg. 1846987139428634858'),
            cursor: z.string().optional().describe('The cursor to paginate through the results. First page is ""'),
        }),
        execute: async ({ tweetId, cursor = "" }) => {
            const params: Record<string, string> = {
                tweetId,
            };

            if (cursor) {
                params.cursor = cursor;
            }

            return callTwitterApi('tweet/retweeters', params);
        },
    }),

    // 11. 奖励用户代币
    rewardUserPoints: tool({
        description: 'Reward points to a user for completing a mission',
        parameters: z.object({
            userName: z.string().describe('The username of the reward receiver'),
            points: z.number().describe('The amount of points to be rewarded'),
            missionId: z.string().describe('The id of the mission that was completed'),
            missionDetails: z.string().optional().describe('Additional details about the completed mission'),
        }),
        execute: async ({ userName, points, missionId, missionDetails }) => {
            // Call the function from supabaseService
            return rewardUserPoints({ userName, points, missionId, missionDetails });
        },
    }),

    // 12. 检查用户是否已经从特定任务获得过奖励
    checkUserRewardHistory: tool({
        description: 'Check if a user has already received rewards for a specific mission',
        parameters: z.object({
            userName: z.string().describe('The username to check'),
            mission: z.string().describe('The mission to check'),
        }),
        execute: async ({ userName, mission }) => {
            // Call the function from supabaseService
            return checkUserRewardHistory({ userName, mission });
        },
    }),

    // 13. 扣除用户积分
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
            return deductUserPoints({ userName, points, missionId, missionDetails });
        },
    }),

    // 14. 生成随机数
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

    // 15. 获取用户当前积分
    getUserCurrentPoints: tool({
        description: 'Get the current points of a user from the Campaign Points table. Returns an object with points and potentially error/message fields.',
        parameters: z.object({
            userName: z.string().describe('The username to get points for'),
        }),
        execute: async ({ userName }) => {
            try {
                // Call the function that might throw
                const points = await getUserPointsByHandle(userName);
                // If successful, return the points
                return {
                    points: points,
                    message: `User ${userName} has ${points} points.`
                 };
            } catch (error) {
                // If an error is caught, format it for the AI tool
                console.error(`Tool Error: Failed to get points for ${userName}:`, error);
                // Type assertion for error
                const errorMessage = error instanceof Error ? error.message : String(error);

                return {
                    points: 0,
                    error: errorMessage, // Include the raw error message
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
        execute: async ({ userName }) => {
            try {
                let cursor = "";
                let hasMorePages = true;

                // 遍历所有关注列表页
                while (hasMorePages) {
                    // 获取用户关注列表的当前页
                    const followingsResponse = await callTwitterApi('user/followings', {
                        userName: userName,
                        cursor: cursor
                    });

                    // 检查API调用是否返回错误
                    if (followingsResponse.error) {
                        console.log(followingsResponse)
                        return {
                            error: followingsResponse.error,
                            details: followingsResponse.details,
                            followsNuwaDev: false
                        };
                    }

                    // 检查关注列表中是否包含NuwaDev
                    const followings = followingsResponse.followings || []; // Default to empty array
                    // Provide a type for 'following' to fix the linter error
                    const followsNuwaDev = followings.some((following: { screen_name: string }) =>
                        following.screen_name.toLowerCase() === 'nuwadev'
                    );

                    // 如果找到NuwaDev，立即返回结果
                    if (followsNuwaDev) {
                        return {
                            followsNuwaDev: true,
                            message: `User ${userName} follows @NuwaDev`
                        };
                    }

                    // 获取下一页的cursor
                    cursor = followingsResponse.next_cursor || "";
                    hasMorePages = followingsResponse.has_next_page || false;
                }

                // 如果遍历完所有页面都没有找到NuwaDev
                return {
                    followsNuwaDev: false,
                    message: `User ${userName} does not follow @NuwaDev`
                };
            } catch (error) {
                return {
                    error: `Error checking if user follows NuwaDev: ${error instanceof Error ? error.message : String(error)}`,
                    followsNuwaDev: false
                };
            }
        },
    }),

    // 17. 发送推文内容到Twitter卡片
    sendPostToTwitterCard: tool({
        description: 'Create a Twitter card preview with content and optional image URL',
        parameters: z.object({
            content: z.string().describe('The content of the tweet to be displayed'),
            imageUrl: z.string().optional().describe('URL of an image to include in the tweet (optional)'),
        }),
        execute: async ({ content, imageUrl }) => {
            try {
                // 这里只返回数据，实际的Twitter发布逻辑将在UI组件中处理
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
}; 