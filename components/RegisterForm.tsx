"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, User, Eye, EyeOff, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [dob, setDob] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }

        if (!cpf || cpf.length < 11) {
            setError("CPF inválido.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        cpf: cpf.replace(/\D/g, ''),
                        dob: dob,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`, // Auto-generate avatar
                    },
                },
            });

            if (error) throw error;

            alert('Cadastro realizado! Verifique seu email para confirmar.');
            router.push('/login');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-surface rounded-xl p-8 space-y-6 shadow-2xl relative z-10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Criar Conta</h1>
                <p className="text-gray-400 text-sm">Junte-se a milhares de apostadores</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="Seu Nome"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">CPF</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="Apenas números"
                            required
                        />
                    </div>
                    <p className="text-[10px] text-gray-500">IMPORTANTE: Entradas e saídas via PIX devem ser do mesmo titular e CPF.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Data de Nascimento</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                            required
                        />
                    </div>
                </div>

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
                    <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
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
                    <label className="text-xs font-bold text-gray-400 uppercase">Confirmar Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/40 border border-surface rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Criando conta...' : 'Registrar'} <ArrowRight className="w-4 h-4" />
                </button>
            </form>

            <div className="text-center text-sm text-gray-400">
                Já tem uma conta? <Link href="/login" className="text-primary hover:underline">Fazer login</Link>
            </div>
        </div>
    );
}
