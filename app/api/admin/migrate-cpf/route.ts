import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TEMPORARY migration endpoint - DELETE after use
export async function GET() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    const results: any[] = [];

    // Step 1: Add CPF column
    const { error: e1 } = await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cpf TEXT;`
    }).single();
    results.push({ step: 'add_cpf_column', error: e1?.message || null });

    // Step 2: Add DOB column
    const { error: e2 } = await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob TEXT;`
    }).single();
    results.push({ step: 'add_dob_column', error: e2?.message || null });

    // Step 3: Backfill from auth.users metadata
    const { error: e3 } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
            UPDATE public.users u
            SET
              cpf = am.raw_user_meta_data->>'cpf',
              dob = am.raw_user_meta_data->>'dob'
            FROM auth.users am
            WHERE am.id = u.id
              AND (am.raw_user_meta_data->>'cpf' IS NOT NULL OR am.raw_user_meta_data->>'dob' IS NOT NULL);
        `
    }).single();
    results.push({ step: 'backfill_from_auth', error: e3?.message || null });

    // Step 4: Create/update trigger function
    const { error: e4 } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS TRIGGER AS $$
            BEGIN
              INSERT INTO public.users (id, email, full_name, cpf, dob, avatar_url)
              VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'cpf',
                NEW.raw_user_meta_data->>'dob',
                NEW.raw_user_meta_data->>'avatar_url'
              )
              ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
                cpf = COALESCE(EXCLUDED.cpf, public.users.cpf),
                dob = COALESCE(EXCLUDED.dob, public.users.dob),
                avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        `
    }).single();
    results.push({ step: 'create_trigger', error: e4?.message || null });

    return NextResponse.json({ success: true, results });
}
