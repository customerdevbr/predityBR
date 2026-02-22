"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlogListClient() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPosts = async () => {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setPosts(data);
            }
            setLoading(false);
        };
        loadPosts();
    }, []);

    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <p className="font-bold text-gray-500">Nenhum artigo disponível ainda.</p>
                <p className="text-xs text-gray-700 mt-1">Nossa equipe está preparando novidades.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map(p => (
                <div key={p.id} className="bg-black/20 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                    <div className="flex flex-col md:flex-row gap-5">
                        {p.image_url && (
                            <img
                                src={p.image_url}
                                alt={p.title}
                                className="w-full md:w-48 h-32 rounded-lg object-cover flex-shrink-0 border border-white/5"
                            />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-black text-white">{p.title}</h3>
                                <div className="text-xs font-medium text-primary mt-1 mb-3">
                                    {format(new Date(p.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                    {p.content}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
