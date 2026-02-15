"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Phone, Mail, Lock, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoading(false);
        };
        getUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Carregando...</div>;

    return (
        <div className="max-w-md mx-auto space-y-8 pb-20">
            <h1 className="text-xl font-bold mb-6">Dados Pessoais</h1>

            {/* Nome */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome</label>
                <div className="bg-surface rounded-lg p-4 text-white font-medium border border-white/5 flex items-center justify-between">
                    <span>{user?.user_metadata?.full_name || 'Não informado'}</span>
                </div>
            </div>

            {/* CPF/CNPJ */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">CPF/CNPJ</label>
                <div className="bg-surface rounded-lg p-4 text-white font-medium border border-white/5 opacity-50 cursor-not-allowed">
                    <span>000.000.000-00</span>
                </div>
            </div>

            <h2 className="text-sm font-bold text-gray-400 uppercase pt-4">Segurança</h2>

            {/* Status Verificação */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Status verificação</label>
                <div className="bg-surface rounded-lg p-3 flex items-center justify-between border border-white/5">
                    <span className="font-bold text-white flex items-center gap-2">
                        Não Verificado
                    </span>
                    <button className="text-xs font-bold text-primary hover:text-green-400 transition-colors uppercase">
                        Verificar
                    </button>
                </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                <div className="bg-surface rounded-lg p-3 flex items-center justify-between border border-white/5">
                    <span className="text-white truncate max-w-[200px]">{user?.email}</span>
                    <button className="text-xs font-bold text-primary hover:text-green-400 transition-colors uppercase">
                        Alterar
                    </button>
                </div>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                <div className="bg-surface rounded-lg p-3 flex items-center justify-between border border-white/5">
                    <span className="text-gray-400">Sem telefone</span>
                    <button className="text-xs font-bold text-primary hover:text-green-400 transition-colors uppercase">
                        Alterar
                    </button>
                </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                <div className="bg-surface rounded-lg p-3 flex items-center justify-between border border-white/5">
                    <span className="text-gray-400">••••••••</span>
                    <button className="text-xs font-bold text-primary hover:text-green-400 transition-colors uppercase">
                        Alterar
                    </button>
                </div>
            </div>


            <h2 className="text-sm font-bold text-gray-400 uppercase pt-4">Configurações</h2>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-500 font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all mt-4"
            >
                <LogOut className="w-4 h-4" />
                Sair da conta
            </button>

            {/* Support FAB (Floating Action Button style for WhatsApp as requested implicitly?) User showed green button in corner in print 1? Or maybe BottomNav covers it. Print 1 has a green chat bubble. */}
            <div className="fixed bottom-20 right-4 z-40 md:bottom-8">
                <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 fill-current" />
                </button>
            </div>
        </div>
    );
}
