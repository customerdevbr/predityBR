"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) throw resetError;

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ocorreu um erro ao tentar recuperar a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10 text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white">E-mail Enviado!</h2>
                <p className="text-gray-400 text-sm">
                    Se o endereço <strong>{email}</strong> estiver cadastrado na nossa plataforma, você receberá um link seguro para redefinir sua senha em instantes.
                </p>
                <div className="pt-4">
                    <Link href="/login" className="text-primary font-bold hover:underline transition-all">
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Recuperar Senha</h1>
                <p className="text-gray-400 text-sm">Digite seu e-mail para receber as instruções</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full py-3 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {loading ? 'Enviando...' : 'Pedir Nova Senha'} <ArrowRight className="w-4 h-4" />
                </button>
            </form>

            <div className="text-center text-sm text-gray-400">
                Lembrou a senha? <Link href="/login" className="text-primary hover:underline">Faça login</Link>
            </div>
        </div>
    );
}
