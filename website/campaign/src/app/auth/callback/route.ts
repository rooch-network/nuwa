// filepath: /workspaces/nuwa/website/campaign/src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/app/services/supabase'
import { createServiceClient } from '@/app/services/supabase'

// 确保用户记录存在于campaign_points表中
async function ensureUserRecord(handle: string, name: string, avatar: string): Promise<boolean> {
    try {
        const supabase = await createServiceClient()
        // 检查用户是否已存在
        const { data, error } = await supabase
            .from('campaign_points')
            .select('id')
            .eq('handle', handle)
            .limit(1)

        if (error) {
            console.error('Error checking user existence:', error)
            return false
        }

        // 如果用户不存在，创建新记录
        if (data.length === 0) {
            const { error: insertError } = await supabase
                .from('campaign_points')
                .insert({
                    handle: handle,
                    name: name,
                    avatar: avatar,
                    points: 0,
                    updated_at: new Date().toISOString()
                })

            if (insertError) {
                console.error('Error creating user record:', insertError)
                return false
            }
            console.log(`Successfully created user record for ${handle}`)
        } else {
            // 更新用户信息
            const { error: updateError } = await supabase
                .from('campaign_points')
                .update({
                    name: name,
                    avatar: avatar,
                    updated_at: new Date().toISOString()
                })
                .eq('handle', handle)

            if (updateError) {
                console.error('Error updating user info:', updateError)
                // 仍然返回true，因为用户记录已存在
            } else {
                console.log(`Successfully updated user info for ${handle}`)
            }
        }
        
        return true
    } catch (error) {
        console.error('Error in ensureUserRecord:', error)
        return false
    }
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    if (code) {
        const response = NextResponse.redirect(requestUrl.origin)
        const supabase = await createRouteHandlerClient(request, response)
        
        try {
            // 使用授权码交换会话
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            
            if (error) {
                console.error('Error exchanging code for session:', error)
                return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
            }
            
            // 处理用户信息同步到campaign_points表
            if (data.session?.user) {
                const user = data.session.user
                const userMetadata = user.user_metadata
                
                // 提取Twitter用户名和资料信息
                // Twitter OAuth可能将用户名存储在不同的元数据字段
                const handle = userMetadata.preferred_username || 
                               userMetadata.user_name || 
                               userMetadata.twitter_handle
                
                const name = userMetadata.name || 
                             userMetadata.full_name || 
                             user.email || 'User'
                
                const avatar = userMetadata.avatar_url || 
                               userMetadata.picture || 
                               ''
                
                if (handle) {
                    await ensureUserRecord(handle, name, avatar)
                }
            }
            
            return response
        } catch (error) {
            console.error('Unexpected error during auth callback:', error)
            return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
        }
    }
    
    // 如果没有code参数，重定向到首页
    return NextResponse.redirect(requestUrl.origin)
}