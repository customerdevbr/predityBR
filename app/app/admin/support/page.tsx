"use client";

import { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, MessageCircle, MoreVertical, Search, User, CheckCircle, Paperclip } from 'lucide-react';

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, users(full_name)')
            .order('created_at', { ascending: false });

        if (data) {
            setTickets(data);
            if (data.length > 0) setSelectedTicket(data[0]);
        }
        setLoading(false);
    };

    // Chat Logic
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch Messages when Ticket Selected
    useEffect(() => {
        if (!selectedTicket) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', selectedTicket.id)
                .order('created_at', { ascending: true });
            if (data) setMessages(data);
        };

        fetchMessages();

        // Subscribe to this ticket's messages
        const channel = supabase
            .channel(`admin_ticket_${selectedTicket.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedTicket]);

    // Auto-scroll
    useEffect(() => {
        if (selectedTicket) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, selectedTicket]);

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket) return;

        const text = reply;
        setReply("");

        // Optimistic Update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            ticket_id: selectedTicket.id,
            user_id: selectedTicket.user_id,
            message: text,
            sender: 'agent',
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            // 1. Insert Message
            const { error: msgError } = await supabase.from('support_messages').insert({
                ticket_id: selectedTicket.id,
                user_id: selectedTicket.user_id, // Important for RLS if user reads by own ID
                message: text,
                sender: 'agent'
            });

            if (msgError) throw msgError;

            // 2. Update Ticket Status if needed (OPTIONAL)
            if (selectedTicket.status === 'OPEN') {
                await supabase
                    .from('support_tickets')
                    .update({ status: 'IN_PROGRESS' })
                    .eq('id', selectedTicket.id);
                // Ideally update local state too
            }

        } catch (err: any) {
            alert("Erro ao enviar: " + err.message);
            setReply(text); // Revert
            setMessages((prev) => prev.filter(m => m.id !== tempMsg.id)); // Remove temp
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket) return;
        if (!confirm("Marcar ticket como RESOLVIDO?")) return;

        // Optimistic Update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            ticket_id: selectedTicket.id,
            user_id: selectedTicket.user_id,
            message: "Chamado finalizado pelo suporte.",
            sender: 'agent',
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);
        setSelectedTicket((prev: any) => ({ ...prev, status: 'RESOLVED' }));

        try {
            // 1. Insert "Finalized" System Message
            // Using 'agent' sender to comply with DB constraints, 
            // UI detects the specific message text to style it as system.
            const { error: msgError } = await supabase.from('support_messages').insert({
                ticket_id: selectedTicket.id,
                user_id: selectedTicket.user_id,
                message: "Chamado finalizado pelo suporte.",
                sender: 'agent'
            });

            if (msgError) throw msgError;

            // 2. Update Status
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: 'RESOLVED' })
                .eq('id', selectedTicket.id);

            if (error) throw error;

            // Refresh list
            fetchTickets();

        } catch (error: any) {
            alert("Erro: " + error.message);
            // Revert state if possible or just alert
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Suporte ao Cliente</h1>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Inbox List */}
                <div className="md:col-span-1 bg-surface/30 border border-white/5 rounded-xl overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar tickets..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {tickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Nenhum ticket aberto.</div>
                        ) : (
                            tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-white text-sm truncate pr-2">{ticket.subject}</h4>
                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                            {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2">{ticket.status}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-surface border border-white/10 flex items-center justify-center text-[8px] text-gray-400">
                                            <User className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs text-gray-500 truncate max-w-[150px]">{ticket.users?.full_name || 'Usuário'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="md:col-span-2 bg-surface/30 border border-white/5 rounded-xl flex flex-col h-[600px]">
                    {selectedTicket ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        #{selectedTicket.id.substring(0, 3)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{selectedTicket.subject}</h3>
                                        <p className="text-xs text-gray-400">
                                            Ticket #{selectedTicket.id.substring(0, 8)} • {selectedTicket.status}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResolve}
                                    className="text-gray-400 hover:text-green-500 flex items-center gap-2 text-xs border border-white/10 px-3 py-1.5 rounded transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" /> Resolver
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-500 text-sm mt-10">Histórico vazio.</div>
                                )}
                                {messages.map((msg) => {
                                    const isSystemMessage = msg.message === "Chamado finalizado pelo suporte.";
                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${msg.sender === 'agent' && !isSystemMessage ? 'justify-end' : isSystemMessage ? 'justify-center' : 'justify-start'}`}>
                                            {msg.sender !== 'agent' && !isSystemMessage && <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex-shrink-0 flex items-center justify-center text-xs"><User className="w-4 h-4" /></div>}

                                            <div className={`p-3 rounded-lg max-w-[80%] ${msg.sender === 'agent' && !isSystemMessage
                                                ? 'bg-primary text-white rounded-tr-none'
                                                : isSystemMessage
                                                    ? 'bg-white/10 text-gray-400 text-xs italic py-1 px-4 rounded-full my-2'
                                                    : 'bg-surface border border-white/10 text-gray-300 rounded-tl-none'
                                                }`}>

                                                {msg.attachment_url ? (
                                                    msg.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                                            <img src={msg.attachment_url} alt="Anexo" className="rounded-md max-w-full h-auto border border-white/10 mb-2" />
                                                        </a>
                                                    ) : (
                                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs underline mb-2">
                                                            <div className="w-4 h-4"><Paperclip className="w-3 h-3" /></div> Ver Anexo
                                                        </a>
                                                    )
                                                ) : null}

                                                <p className="text-sm">{msg.message}</p>
                                                {!isSystemMessage && (
                                                    <span className="text-[10px] opacity-50 block mt-1 text-right">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>

                                            {msg.sender === 'agent' && !isSystemMessage && <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-xs text-primary font-bold">A</div>}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                        placeholder="Digite sua resposta..."
                                        disabled={selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={handleSendReply}
                                        disabled={!reply.trim() || selectedTicket.status === 'RESOLVED'}
                                        className="bg-primary hover:bg-primary/90 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Mail className="w-12 h-12 mb-4 opacity-20" />
                            <p>Selecione um ticket para ver os detalhes</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
