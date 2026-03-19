"use client";

import { useEffect } from 'react';
import { Bitcoin, RefreshCw } from 'lucide-react';

export default function BTCError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('BTC market error:', error);
    }, [error]);

    return (
        <div className="min-h-screen pt-20 pb-32 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm mx-auto px-4">
                <div className="w-16 h-16 bg-[#f7931a]/10 rounded-full flex items-center justify-center mx-auto border border-[#f7931a]/20">
                    <Bitcoin className="w-8 h-8 text-[#f7931a]" />
                </div>
                <h2 className="text-white font-bold text-lg">Erro ao carregar mercado BTC</h2>
                <p className="text-gray-500 text-sm">Houve um problema ao carregar o mercado. Tente novamente.</p>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-[#f7931a] text-white font-bold rounded-xl hover:bg-[#f7931a]/90 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}
