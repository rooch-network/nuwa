import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'

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

// Singleton instance for client component client
let clientComponentClient: ReturnType<typeof createSupabaseClient> | null = null;

// 为客户端组件创建 Supabase 客户端
export function createClientComponentClient() {
    if (!clientComponentClient) {
        clientComponentClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                flowType: 'pkce',
            }
        });
    }
    return clientComponentClient;
}

// 服务端专用的 Supabase 客户端创建函数
export async function createServerComponentClient() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
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

// 路由处理程序专用的 Supabase 客户端创建函数
export async function createRouteHandlerClient(request: Request, response: Response) {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
                cookieStore.set({ name, value, ...options })
                response.headers.set('Set-Cookie', `${name}=${value}; ${Object.entries(options).map(([key, value]) => `${key}=${value}`).join('; ')}`)
            },
            remove(name: string, options: CookieOptions) {
                cookieStore.set({ name, value: '', ...options })
                response.headers.set('Set-Cookie', `${name}=; ${Object.entries(options).map(([key, value]) => `${key}=${value}`).join('; ')}`)
            }
        }
    })
}