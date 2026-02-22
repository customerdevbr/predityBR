"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, Trash2, Image as ImageIcon, Save, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminBlogPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        // Will fallback gracefully if table doesn't exist yet via our creation script
        const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setPosts(data);
        } else {
            // Attempt to create table via RPC if we have one or just gracefully handle empty state while the user needs to run SQL.
            console.warn("Blog posts fetch error:", error);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            alert("Título e conteúdo são obrigatórios.");
            return;
        }

        setSaving(true);
        const { data, error } = await supabase.from('blog_posts').insert([
            { title, content, image_url: imageUrl || null }
        ]).select();

        setSaving(false);

        if (error) {
            console.error("Erro ao salvar post:", error);
            alert("Erro ao salvar postagem. A tabela 'blog_posts' existe no banco?");
        } else {
            setTitle('');
            setContent('');
            setImageUrl('');
            setIsCreating(false);
            if (data) setPosts([data[0], ...posts]);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente apagar esta postagem?')) return;

        const { error } = await supabase.from('blog_posts').delete().eq('id', id);
        if (!error) {
            setPosts(posts.filter(p => p.id !== id));
        } else {
            alert('Erro ao apagar postagem.');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary" /> Blog & Dicas
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Gerencie artigos, tutoriais e dicas para os usuários.</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/80 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Novo Post
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-[#0d121a] border border-white/5 rounded-2xl p-6">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Título do Post</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
                                placeholder="Como lucrar apostando com segurança..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 flex flex-row items-center gap-2"><ImageIcon className="w-3 h-3" /> URL da Imagem de Capa (Opcional)</label>
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Conteúdo do Post (Texto)</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={8}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary/50 outline-none resize-none"
                                placeholder="Escreva o conteúdo estruturado aqui..."
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-5 py-2.5 bg-white/5 text-gray-400 font-bold rounded-xl hover:text-white transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/80 transition-colors flex items-center gap-2 text-sm"
                            >
                                {saving ? 'Aguarde...' : <><Save className="w-4 h-4" /> Publicar Post</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-[#0d121a] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="font-bold text-white">Postagens Publicadas</h2>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : posts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Nenhum post publicado ainda.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {posts.map(p => (
                            <div key={p.id} className="p-6 flex items-start gap-4">
                                {p.image_url ? (
                                    <img src={p.image_url} alt="Cover" className="w-24 h-16 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                                ) : (
                                    <div className="w-24 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-gray-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white truncate">{p.title}</h3>
                                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">{p.content}</p>
                                    <div className="text-xs text-gray-600 mt-2">
                                        Publicado em {format(new Date(p.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
