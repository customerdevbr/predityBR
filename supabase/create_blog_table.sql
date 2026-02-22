CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Permissão básica caso o RLS seja ativado futuramente ou para leitura unauthenticated
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."blog_posts"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Política para Admin gerenciar os posts
CREATE POLICY "Enable all access for admins" ON "public"."blog_posts"
AS PERMISSIVE FOR ALL
TO authenticated
USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN' )
WITH CHECK ( (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN' );
