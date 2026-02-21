import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const supabase = await createClient();

    return (
        <div className="min-h-screen py-12 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full opacity-20 pointer-events-none"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 px-4">
                {/* Login Form */}
                <LoginForm />
            </div>
        </div>
    );
}
