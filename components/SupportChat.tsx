"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Paperclip } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function SupportChat({ user: initialUser }: { user: User | null }) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [isOpen, setIsOpen] = useState(false);

    // Sync with auth changes for immediate visibility
    useEffect(() => {
        setUser(initialUser);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, [initialUser]);

    const [messages, setMessages] = useState<{ from: 'user' | 'agent', text: string }[]>([
        { from: 'agent', text: 'Olá! Bem-vindo ao suporte da PredityBR. Como posso ajudar você hoje?' }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        setMessages(prev => [...prev, { from: 'user', text: input }]);
        setInput("");

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, { from: 'agent', text: 'Um de nossos atendentes entrará em contato em breve.' }]);
        }, 1000);
    };

    // Only render if user exists, but Hooks must run first
    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={toggleChat}
                className="fixed bottom-24 md:bottom-8 right-4 z-[100] bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center"
            >
                <MessageCircle className="w-6 h-6" />
            </button>

            {/* Chat Sidebar/Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleChat}></div>

                    {/* Sidebar */}
                    <div className="relative w-full max-w-sm h-full bg-[#0f1115] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/20">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <h3 className="font-bold text-white">Suporte Online</h3>
                            </div>
                            <button onClick={toggleChat} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${msg.from === 'user'
                                        ? 'bg-primary text-white rounded-tr-none'
                                        : 'bg-surface text-gray-300 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-surface/10">
                            <div className="flex items-center gap-2">
                                <button className="text-gray-400 hover:text-white p-2">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                />
                                <button
                                    onClick={handleSend}
                                    className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
