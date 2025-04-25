import { createClient, createServiceClient } from './supabase';

export interface LeaderboardUser {
    id: string;
    handle: string;
    name: string;
    avatar: string;
    points: number;
    rank?: number;
}

export interface PointsHistoryItem {
    id: string;
    points: number;
    mission: string;
    createdTime: string;
    missionTitle?: string;
    missionDescription?: string;
    missionDetails?: string;
}

/**
 * Retrieves the points for a given Twitter handle.
 * Throws an error if the user is not found or if there's a database error.
 */
export async function getUserPointsByHandle(twitterHandle: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('campaign_points')
        .select('points')
        .eq('handle', twitterHandle)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Handle user not found specifically
            console.warn(`User not found for handle: ${twitterHandle}`);
            throw new Error(`User not found: ${twitterHandle}`);
        }
        // Handle other potential database errors
        console.error(`Error fetching user points for handle ${twitterHandle}:`, error);
        throw new Error(`Database error fetching points: ${error.message}`);
    }

    if (!data) {
         // Should ideally not happen if error is null and code is not PGRST116, but good practice to check
         console.error(`No data returned for handle ${twitterHandle} despite no error.`);
         throw new Error(`User data not found for handle: ${twitterHandle}`);
    }

    return data.points;
    // Removed the outer try...catch block as we now throw errors directly
}

export async function getUserPointsHistory(twitterHandle: string): Promise<PointsHistoryItem[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('points_reward_log')
            .select('*')
            .eq('reward_to', twitterHandle)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching user points history:", error);
            return [];
        }

        return data.map(item => ({
            id: item.id,
            points: item.points,
            mission: item.mission,
            createdTime: item.created_at,
            missionDetails: item.mission_details || ''
        }));
    } catch (error) {
        console.error("Error in getUserPointsHistory:", error);
        return [];
    }
}

export async function getLeaderboardData(): Promise<LeaderboardUser[]> {
    try {
        const supabase = await createClient();

        // 获取所有用户数据并按积分降序排序
        const { data, error } = await supabase
            .from('campaign_points')
            .select('*')
            .order('points', { ascending: false });

        if (error) {
            console.error('Error fetching leaderboard data:', error);
            return [];
        }

        // 添加排名信息
        return data.map((user, index) => ({
            ...user,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Error in getLeaderboardData:', error);
        return [];
    }
}

// Function to reward points to a user
export async function rewardUserPoints({ userName, points, missionId, missionDetails }: { userName: string, points: number, missionId: string, missionDetails?: string }) {
    try {
        const supabase = await createServiceClient();

        // Find user
        const { data: userData, error: userError } = await supabase
            .from('campaign_points')
            .select('id, points')
            .eq('handle', userName)
            .single();

        if (userError) {
            console.error('Error finding user in Supabase:', userError);
            return {
                success: false,
                message: `Failed to find user ${userName}`
            };
        }

        if (!userData) {
            return {
                success: false,
                message: `User ${userName} not found in campaign_points table`
            };
        }

        // Add reward record
        const { error: rewardError } = await supabase
            .from('points_reward_log')
            .insert({
                reward_to: userName,
                points: points,
                mission: missionId,
                mission_details: missionDetails || '',
            });

        if (rewardError) {
            console.error('Error adding reward record to Supabase:', rewardError);
            return {
                success: false,
                message: `Failed to add reward record for user ${userName}`
            };
        }

        // Update user points
        const newPoints = userData.points + points;
        const { error: updateError } = await supabase
            .from('campaign_points')
            .update({ points: newPoints })
            .eq('id', userData.id);

        if (updateError) {
            console.error('Error updating user points in Supabase:', updateError);
            return {
                success: false,
                message: `Failed to update points for user ${userName}`
            };
        }

        return {
            success: true,
            message: `Successfully rewarded ${points} points to user ${userName} for completing mission: ${missionId} : ${missionDetails}`
        };
    } catch (error) {
        return {
            success: false,
            message: `Error rewarding points: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Function to check user reward history for a specific mission
export async function checkUserRewardHistory({ userName, mission }: { userName: string, mission: string }) {
    try {
        const supabase = await createClient();

        // Query records
        const { data, error } = await supabase
            .from('points_reward_log')
            .select('mission_details')
            .eq('reward_to', userName)
            .eq('mission', mission)
            .limit(1);

        if (error) {
            console.error('Error checking user reward history from Supabase:', error);
            return {
                hasReceivedReward: false,
                message: `Error checking reward history: ${error.message}`
            };
        }

        const hasReceived = data && data.length > 0;
        return {
            hasReceivedReward: hasReceived,
            missionDetails: hasReceived ? data[0].mission_details || '' : '',
            message: hasReceived
                ? `User ${userName} has already received rewards for mission: ${mission}`
                : `User ${userName} has not received rewards for mission: ${mission} yet`
        };
    } catch (error) {
        return {
            hasReceivedReward: false,
            message: `Error checking reward history: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Function to deduct points from a user
export async function deductUserPoints({ userName, points, missionId, missionDetails }: { userName: string, points: number, missionId: string, missionDetails?: string }) {
    try {
        if (points <= 0) {
            return {
                success: false,
                message: `Points to deduct must be a positive number`
            };
        }

        const supabase = await createServiceClient();

        // Find user
        const { data: userData, error: userError } = await supabase
            .from('campaign_points')
            .select('id, points')
            .eq('handle', userName)
            .single();

        if (userError && userError.code !== 'PGRST116') { // Allow user not found error
            console.error('Error finding user in Supabase:', userError);
            return {
                success: false,
                message: `Failed to find user ${userName}`
            };
        }

        if (!userData || userData.points < points) {
            return {
                success: false,
                message: `User ${userName} does not have enough points to deduct or does not exist`
            };
        }

        // Add deduction record
        const { error: rewardError } = await supabase
            .from('points_reward_log')
            .insert({
                reward_to: userName,
                points: -points, // Negative points for deduction
                mission: missionId,
                mission_details: missionDetails || '',
            });

        if (rewardError) {
            console.error('Error adding deduction record to Supabase:', rewardError);
            return {
                success: false,
                message: `Failed to add deduction record for user ${userName}`
            };
        }

        // Update user points
        const newPoints = userData.points - points;
        const { error: updateError } = await supabase
            .from('campaign_points')
            .update({ points: newPoints })
            .eq('id', userData.id);

        if (updateError) {
            console.error('Error updating user points in Supabase:', updateError);
            // Attempt to rollback deduction log entry if update fails?
            return {
                success: false,
                message: `Failed to update points for user ${userName}`
            };
        }

        return {
            success: true,
            message: `Successfully deducted ${points} points from user ${userName} for mission: ${missionId} : ${missionDetails}`
        };
    } catch (error) {
        return {
            success: false,
            message: `Error deducting points: ${error instanceof Error ? error.message : String(error)}`
        };
    }
} 