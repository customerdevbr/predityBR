import BlogListClient from '@/components/BlogListClient';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
    title: 'PredityBR - Blog & Dicas',
    description: 'Acompanhe as últimas dicas do mercado, novidades da plataforma e análises profundas sobre os mercados abertos da Predity.',
}

export default async function PublicBlogPage() {
    // We are deliberately keeping this Server Component lean to fetch data and pass to the client,
    // or just let the client fetch. Since BlogListClient already has the fetching logic, we can reuse it.

    // We get the Supabase instance here just to verify if we want SSR, 
    // but the Client Component performs real-time updates and fetch anyway.

    return (
        <div className="min-h-screen bg-[#0d1117] pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">

                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Mural da Predity
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Acompanhe dicas de mercado, estratégias para maximizar seus ganhos e novidades exclusivas da plataforma.
                    </p>
                </div>

                {/* Reuse the internal component that has the fetch logic and UI */}
                <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8">
                    <BlogListClient isAdmin={false} />
                </div>

            </div>
        </div>
    );
}
