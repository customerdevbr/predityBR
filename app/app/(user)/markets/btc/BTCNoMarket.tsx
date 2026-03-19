"use client";

import { useEffect, useState } from 'react';
import { Bitcoin } from 'lucide-react';

export default function BTCNoMarket() {
    const [countdown, setCountdown] = useState(30);

    useEffect(() => {
        if (countdown <= 0) { window.location.reload(); return; }
        const t = setTimeout(() => setCountdown(p => p - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    return (
        <div className="bg-surface/30 border border-white/5 rounded-2xl p-8 text-center space-y-3">
            <Bitcoin className="w-12 h-12 text-gray-600 mx-auto" />
            <h2 className="text-white font-bold">Nenhuma rodada ativa no momento</h2>
            <p className="text-gray-500 text-sm">
                O mercado funciona de <strong className="text-white">09h às 20h</strong>, horário de Brasília.
                Novas rodadas iniciam automaticamente a cada 5 minutos.
            </p>
            <p className="text-xs text-gray-600">
                Verificando nova rodada em <span className="text-[#f7931a] font-bold">{countdown}s</span>...
            </p>
        </div>
    );
}
