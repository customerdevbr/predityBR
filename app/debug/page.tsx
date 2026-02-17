"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
    const [authData, setAuthData] = useState<any>(null);
    const [dbData, setDbData] = useState<any>(null);
    const [dbError, setDbError] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function runDebug() {
            setLoading(true);

            // 1. Check Auth Session
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            setAuthData({ session, error: authError });

            if (session?.user) {
                // 2. Check Public Users Table
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id);

                setDbData(data); // Should be an array of length 1
                setDbError(error);
            }

            setLoading(false);
        }

        runDebug();
    }, []);

    return (
        <div className="p-8 bg-black min-h-screen text-white font-mono space-y-8">
            <h1 className="text-2xl font-bold text-red-500">Página de Diagnóstico (Debug)</h1>

            <div className="space-y-4">
                <section className="border p-4 rounded border-gray-700">
                    <h2 className="text-xl font-bold text-blue-400">1. Autenticação (Auth)</h2>
                    {loading && <p>Carregando...</p>}
                    <pre className="text-xs bg-gray-900 p-2 overflow-auto max-h-40">
                        {JSON.stringify(authData, null, 2)}
                    </pre>
                </section>

                <section className="border p-4 rounded border-gray-700">
                    <h2 className="text-xl font-bold text-green-400">2. Banco de Dados (Public Users)</h2>
                    <p className="text-sm text-gray-400 mb-2">Tentando ler a tabela 'users' com o ID do Auth.</p>

                    {dbData && dbData.length === 0 && (
                        <div className="bg-red-500/20 p-2 border border-red-500 text-red-200 font-bold">
                            ALERTA: Array vazio! O usuário existe no Auth, mas NÃO existe na tabela 'users'.
                            Isso explica o saldo 0 e falta de permissão.
                        </div>
                    )}

                    <pre className="text-xs bg-gray-900 p-2 overflow-auto max-h-40">
                        {JSON.stringify({ data: dbData, error: dbError }, null, 2)}
                    </pre>
                </section>
            </div>
        </div>
    );
}
