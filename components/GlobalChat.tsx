"use client";

import { useEffect, useRef, useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMsg {
    id: string;
    user_id: string;
    message: string;
    created_at: string;
    full_name: string;
    avatar_url: string | null;
    bet_count: number;
}

export default function GlobalChat({ userId }: { userId: string | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Escuta o evento do BottomNav
    useEffect(() => {
        const handler = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-global-chat', handler);
        return () => window.removeEventListener('toggle-global-chat', handler);
    }, []);

    // Carrega mensagens + subscribe quando abre
    useEffect(() => {
        if (!isOpen) return;
        setUnread(0);
        loadMessages();

        const ch = supabase
            .channel('global-chat-live')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'global_chat_messages',
            }, async (payload) => {
                const row = payload.new as any;
                const { data: u } = await supabase
                    .from('users')
                    .select('full_name, avatar_url')
                    .eq('id', row.user_id)
                    .single();
                const { count } = await supabase
                    .from('bets')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', row.user_id);
                setMessages(prev => [...prev, {
                    id: row.id,
                    user_id: row.user_id,
                    message: row.message,
                    created_at: row.created_at,
                    full_name: u?.full_name ?? 'Usuário',
                    avatar_url: u?.avatar_url ?? null,
                    bet_count: count ?? 0,
                }]);
            })
            .subscribe();

        return () => { supabase.removeChannel(ch); };
    }, [isOpen]);

    // Subscribe para unread quando fechado
    useEffect(() => {
        if (isOpen) return;
        const ch = supabase
            .channel('global-chat-unread')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'global_chat_messages',
            }, () => setUnread(p => p + 1))
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [isOpen]);

    // Auto-scroll
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [messages, isOpen]);

    // Focus input quando abre
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    async function loadMessages() {
        const { data, error } = await supabase
            .from('global_chat_messages')
            .select('id, user_id, message, created_at, users(full_name, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error || !data) return; // tabela pode não existir ainda

        // Bet counts para os usuários únicos
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        const { data: bets } = await supabase
            .from('bets')
            .select('user_id')
            .in('user_id', userIds);

        const counts: Record<string, number> = {};
        bets?.forEach((b: any) => { counts[b.user_id] = (counts[b.user_id] ?? 0) + 1; });

        const formatted: ChatMsg[] = data.reverse().map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            message: m.message,
            created_at: m.created_at,
            full_name: m.users?.full_name ?? 'Usuário',
            avatar_url: m.users?.avatar_url ?? null,
            bet_count: counts[m.user_id] ?? 0,
        }));

        setMessages(formatted);
    }

    async function handleSend() {
        if (!userId || !input.trim() || sending) return;
        const text = input.trim();
        setInput('');
        setSending(true);
        try {
            await supabase.from('global_chat_messages').insert({ user_id: userId, message: text });
        } finally {
            setSending(false);
        }
    }

    const firstName = (name: string) => name?.split(' ')[0] ?? 'Usuário';

    return (
        <>
            {/* Painel lateral */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative w-full max-w-sm h-full bg-[#0f1115] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/20">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <h3 className="font-bold text-white">Chat da Comunidade</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 text-sm mt-16 space-y-2">
                                    <MessageSquare className="w-10 h-10 mx-auto text-gray-700" />
                                    <p>Nenhuma mensagem ainda.</p>
                                    <p className="text-xs">Seja o primeiro a falar!</p>
                                </div>
                            )}

                            {messages.map(msg => (
                                <div key={msg.id} className="flex gap-2.5">
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden border border-white/10">
                                        {msg.avatar_url ? (
                                            <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-black text-primary">
                                                {msg.full_name[0]?.toUpperCase() ?? '?'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-1.5 mb-0.5">
                                            <span className="text-xs font-bold text-white">
                                                {firstName(msg.full_name)}
                                            </span>
                                            {msg.bet_count > 0 && (
                                                <span className="text-[10px] text-gray-600">
                                                    {msg.bet_count} {msg.bet_count === 1 ? 'predity' : 'preditys'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-300 break-words leading-relaxed">
                                            {msg.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/10 bg-surface/10">
                            {userId ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value.slice(0, 200))}
                                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                                        placeholder="Enviar mensagem..."
                                        className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || sending}
                                        className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-center text-xs text-gray-500">
                                    <a href="/login" className="text-primary hover:underline">Faça login</a> para participar do chat.
                                </p>
                            )}
                            {input.length > 150 && (
                                <p className="text-[10px] text-gray-600 mt-1 text-right">{input.length}/200</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Badge de não lidas — mostra quando fechado e tem novas mensagens */}
            {!isOpen && unread > 0 && (
                <div className="fixed bottom-20 right-4 z-50 pointer-events-none">
                    <span className="bg-primary text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                        {unread > 9 ? '9+' : unread}
                    </span>
                </div>
            )}
        </>
    );
}
