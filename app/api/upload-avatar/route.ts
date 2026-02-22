import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Previne build estático
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Arquivo deve ser uma imagem (JPG, PNG, GIF, WEBP)' }, { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Imagem muito grande. Máximo 5MB.' }, { status: 400 });
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `avatars/${userId}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage (bucket: avatars)
        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            // If bucket doesn't exist, try to create it
            if (uploadError.message?.includes('Bucket not found')) {
                await supabaseAdmin.storage.createBucket('avatars', { public: true });
                await supabaseAdmin.storage.from('avatars').upload(filename, buffer, {
                    contentType: file.type,
                    upsert: true,
                });
            } else {
                throw uploadError;
            }
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename);
        const avatarUrl = publicUrlData.publicUrl + `?t=${Date.now()}`; // cache bust

        // Update user record
        await supabaseAdmin.from('users').update({ avatar_url: avatarUrl }).eq('id', userId);

        return NextResponse.json({ avatarUrl });
    } catch (error: any) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
