import { createClient } from '@/lib/supabase/server';

export async function POST() {
    const supabase = await createClient();
    const { error } = await supabase.rpc('execute_sql_query', {
        query: `
            CREATE TABLE IF NOT EXISTS public.blog_posts (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        `
    });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: "Blog table created successfully (if RPC exists/permissions allow)." }), { status: 200 });
}
