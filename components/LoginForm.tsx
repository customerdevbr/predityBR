"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (error) throw error;

            // Force hard redirect to App subdomain to avoid client-side routing issues across domains
            // and ensure cookies are properly recognized on the new subdomain.
            const targetUrl = process.env.NODE_ENV === 'production'
                ? 'https://app.preditybr.com/app/markets'
                : '/app/markets'; // Localhost fallback

            window.location.href = targetUrl;
            // router.push('/app/markets');
            // router.refresh();
        } catch (err: any) {
            setError(err.message === "Invalid login credentials" ? "Email ou senha incorretos." : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Acessar Conta</h1>
                <p className="text-gray-400 text-sm">Entre para continuar operando</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">Esqueceu a senha?</Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {loading ? 'Entrando...' : 'Entrar na Plataforma'} <ArrowRight className="w-4 h-4" />
                </button>
            </form>

            <div className="text-center text-sm text-gray-400">
                Não tem uma conta? <Link href="/register" className="text-primary hover:underline">Registre-se agora</Link>
            </div>
        </div>
    );
}
