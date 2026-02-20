"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Paperclip } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function SupportChat({ user: initialUser }: { user: User | null }) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [isOpen, setIsOpen] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with auth changes for immediate visibility
    useEffect(() => {
        setUser(initialUser);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, [initialUser]);

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    // Listen for the mobile BottomNav support button event
    useEffect(() => {
        const handler = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-support-chat', handler);
        return () => window.removeEventListener('toggle-support-chat', handler);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load Active Ticket & Messages
    useEffect(() => {
        if (!user || !isOpen) return;

        let activeTicketId: string | null = null;

        const loadContent = async () => {
            // 1. Find Latest Ticket (Any Status)
            const { data: tickets } = await supabase
                .from('support_tickets')
                .select('id, status')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (tickets && tickets.length > 0) {
                const latestTicket = tickets[0];
                activeTicketId = latestTicket.id; // Store ID for message loading

                // 2. Load Messages for that ticket
                const { data: msgs } = await supabase
                    .from('support_messages')
                    .select('*')
                    .eq('ticket_id', activeTicketId)
                    .order('created_at', { ascending: true });

                if (msgs) setMessages(msgs);
            } else {
                setMessages([]); // Start fresh if no active ticket
            }

            // 3. Subscribe to NEW messages
            const channel = supabase
                .channel('support_chat_user')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'support_messages',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        setMessages((prev) => [...prev, payload.new]);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const cleanupPromise = loadContent();
        return () => {
        };
    }, [user, isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // --- FILE UPLOAD LOGIC ---
    const uploadAttachment = async (file: File): Promise<string | null> => {
        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('support-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('support-attachments')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar arquivo.");
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        await sendWithAttachment(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            const file = e.clipboardData.files[0];
            await sendWithAttachment(file);
        }
    };

    const sendWithAttachment = async (file: File) => {
        if (!user) return;

        const publicUrl = await uploadAttachment(file);
        if (!publicUrl) return;

        // Optimistic Update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            user_id: user.id,
            message: file.type.startsWith('image/') ? 'Imagem enviada' : 'Arquivo enviado',
            sender: 'user',
            created_at: new Date().toISOString(),
            attachment_url: publicUrl
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            const ticketId = await ensureTicket("Anexo: " + file.name);

            // Insert Message
            const { error: msgError } = await supabase.from('support_messages').insert({
                user_id: user.id,
                ticket_id: ticketId,
                message: file.type.startsWith('image/') ? 'Imagem enviada' : 'Arquivo enviado',
                sender: 'user',
                attachment_url: publicUrl
            });

            if (msgError) throw msgError;

        } catch (err) {
            console.error(err);
            setMessages((prev) => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    // Helper to get or create ticket
    const ensureTicket = async (subject: string): Promise<string> => {
        // 1. Check for Active Ticket
        const { data: tickets } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('user_id', user!.id)
            .in('status', ['OPEN', 'IN_PROGRESS'])
            .limit(1);

        if (tickets && tickets.length > 0) {
            return tickets[0].id;
        } else {
            // 2. Create New Ticket
            const { data: newTicket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user!.id,
                    subject: subject.substring(0, 30) + '...',
                    status: 'OPEN'
                })
                .select()
                .single();

            if (ticketError) throw ticketError;
            return newTicket.id;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        const text = input;
        setInput(""); // Optimistic clear

        // Optimistic UI Update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            user_id: user.id,
            message: text,
            sender: 'user',
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            const ticketId = await ensureTicket(text);

            // Insert Message
            const { error: msgError } = await supabase.from('support_messages').insert({
                user_id: user.id,
                ticket_id: ticketId,
                message: text,
                sender: 'user'
            });

            if (msgError) throw msgError;

        } catch (err) {
            console.error(err);
            alert("Erro ao enviar mensagem.");
            setInput(text); // Revert on error
            setMessages((prev) => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    // Only render if user exists, but Hooks must run first
    if (!user) return null;

    return (
        <>
            {/* Floating Button — desktop only, mobile uses BottomNav icon */}
            <button
                onClick={toggleChat}
                className="hidden md:flex fixed bottom-8 right-4 z-[90] bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 items-center justify-center"
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
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 text-sm mt-10">
                                    <p>Olá! Como podemos ajudar?</p>
                                    <p className="text-xs mt-2">Nossa equipe responde em instantes.</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isSystemMessage = msg.message === "Chamado finalizado pelo suporte.";
                                return (
                                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : isSystemMessage ? 'justify-center' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${msg.sender === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : isSystemMessage
                                                ? 'bg-white/10 text-gray-400 text-xs italic py-1 px-4 rounded-full my-2'
                                                : 'bg-surface text-gray-300 rounded-tl-none'
                                            }`}>

                                            {msg.attachment_url ? (
                                                msg.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                                        <img src={msg.attachment_url} alt="Anexo" className="rounded-md max-w-full h-auto border border-white/10 mb-2" />
                                                    </a>
                                                ) : (
                                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs underline mb-2">
                                                        <Paperclip className="w-3 h-3" /> Ver Anexo
                                                    </a>
                                                )
                                            ) : null}

                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })}
                            {isUploading && (
                                <div className="flex justify-end">
                                    <div className="bg-primary/50 text-white p-3 rounded-lg text-xs animate-pulse">Enviando...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-surface/10">
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-gray-400 hover:text-white p-2"
                                    disabled={isUploading}
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    onPaste={handlePaste}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                    disabled={isUploading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isUploading}
                                    className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
