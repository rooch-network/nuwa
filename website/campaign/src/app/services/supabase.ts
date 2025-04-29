import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建服务端客户端（用于写操作）
export async function createServiceClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

// 创建普通客户端（用于读操作）
export const createClient = () => {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// 创建服务端组件的 Supabase 客户端
export function createServerComponentClient() {
    const cookieStore = cookies()
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
                try {
                    cookieStore.set({ name, value, ...options })
                } catch (error) {
                    // 处理只读 cookie 的情况
                }
            },
            remove(name: string, options: CookieOptions) {
                try {
                    cookieStore.set({ name, value: '', ...options })
                } catch (error) {
                    // 处理只读 cookie 的情况
                }
            }
        }
    })
}

// 创建路由处理程序的 Supabase 客户端
export function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
    const cookieStore = cookies()
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
                cookieStore.set({ name, value, ...options })
                response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
                cookieStore.set({ name, value: '', ...options })
                response.cookies.set({ name, value: '', ...options })
            }
        }
    })
}

// 为客户端组件创建 Supabase 客户端
export function createClientComponentClient() {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            flowType: 'pkce',
        }
    })
}