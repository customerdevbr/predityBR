"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Automatically checks if we have a session to do the password update
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // Not authenticated? Something went wrong with the email link
                // Provide a friendly error message or keep them here briefly before sending to login
            }
        });
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);

            // Redirect to login after a few seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao redefinir a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10 text-center">
                <h2 className="text-2xl font-bold text-white">Senha Alterada!</h2>
                <p className="text-gray-400 text-sm">
                    Sua nova senha foi atualizada com sucesso. Você será redirecionado para o login em instantes.
                </p>
                <div className="mt-4 w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Nova Senha</h1>
                <p className="text-gray-400 text-sm">Digite a sua nova senha de acesso</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nova Senha</label>
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

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Confirmar Nova Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="w-full py-3 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Salvando...' : 'Salvar Nova Senha'} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
