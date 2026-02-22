"use client";

import { Mail, MessageCircle, Send } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header Card (Profile Style) */}
                <div
                    className="rounded-2xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #10161e 0%, #0f1115 60%, #0a110a 100%)' }}
                >
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #04B305, #6eff6e, #04B305)' }} />
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30 shadow-[0_0_20px_rgba(47,124,70,0.2)]">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white">Fale Conosco</h1>
                                <p className="text-sm text-gray-400 mt-1">Estamos aqui para ajudar com qualquer dúvida ou problema.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Block */}
                <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-white text-lg">Já é usuário da plataforma?</h3>
                            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                Se você já possui uma conta na PredityBR e está logado, o meio mais rápido de obter atendimento é utilizando o nosso <strong>Chat de Suporte Ao Vivo</strong>. Basta clicar no ícone de chat flutuante localizado no canto inferior direito de qualquer tela dentro do App.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5">
                        <h2 className="font-bold text-white">Envie uma Mensagem</h2>
                        <p className="text-xs text-gray-500 mt-1">Responderemos o mais breve possível no seu e-mail.</p>
                    </div>

                    <form className="p-6 space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Mensagem enviada com sucesso! Logo entraremos em contato.'); }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                                    placeholder="Como devemos lhe chamar?"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                                    placeholder="seu@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assunto</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                                placeholder="Do que se trata?"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sua Mensagem</label>
                            <textarea
                                required
                                rows={5}
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors resize-none"
                                placeholder="Descreva os detalhes da sua requisição..."
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary hover:bg-primary/80 active:bg-primary/70 text-white font-black text-sm rounded-xl transition-all shadow-[0_0_16px_rgba(47,124,70,0.3)] hover:shadow-[0_0_24px_rgba(47,124,70,0.5)] flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" /> Enviar Mensagem
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
