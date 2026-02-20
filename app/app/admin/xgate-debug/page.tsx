"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ ok }: { ok: boolean | undefined }) {
    if (ok === undefined) return <span className="text-gray-400 text-xs">—</span>;
    return ok
        ? <span className="text-xs font-bold text-primary">✅ OK</span>
        : <span className="text-xs font-bold text-red-400">❌ FAIL</span>;
}

function JsonBlock({ data }: { data: any }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-1">
            <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300">
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Ver JSON completo
            </button>
            {open && (
                <pre className="mt-2 bg-black/60 border border-white/5 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-80 leading-relaxed">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function XGateDebugPage() {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [txs, setTxs] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(true);

    const runDiagnostic = async () => {
        setLoading(true);
        setReport(null);
        try {
            const res = await fetch('/api/xgate-debug');
            const data = await res.json();
            setReport(data);
        } catch (e: any) {
            setReport({ fatal: e.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        setTxLoading(true);
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'DEPOSIT')
            .order('created_at', { ascending: false })
            .limit(30);
        setTxs(data || []);
        setTxLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
        runDiagnostic();
    }, []);

    const s = report?.steps || {};

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 pt-8 pb-32">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">🔍 PIX Debug — XGate</h1>
                    <p className="text-xs text-gray-500 mt-1">Página oculta de diagnóstico — não indexada</p>
                </div>
                <button
                    onClick={() => { runDiagnostic(); fetchTransactions(); }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/85 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Re-rodar Diagnóstico
                </button>
            </div>

            {/* ENV Check */}
            {report?.env && (
                <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Variáveis de Ambiente</h2>
                    {Object.entries(report.env).map(([k, v]: any) => (
                        <div key={k} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-gray-400">{k}</span>
                            <span className={v.startsWith('✅') ? 'text-primary text-xs font-bold' : 'text-red-400 text-xs font-bold'}>{v}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Step-by-step diagnostic */}
            {loading && (
                <div className="text-center py-12 text-gray-500 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
                    Rodando diagnóstico completo... (pode levar ~10s)
                </div>
            )}

            {report && !loading && (
                <div className="space-y-4">

                    {/* Fatal */}
                    {report.fatal && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 font-bold text-sm flex items-center gap-2">
                            <XCircle className="w-5 h-5 flex-shrink-0" />
                            {report.fatal}
                        </div>
                    )}

                    {/* Step 1: Auth */}
                    <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white">1. Autenticação XGate</h2>
                            <StatusBadge ok={s.auth?.ok} />
                        </div>
                        {s.auth && (
                            <>
                                <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
                                    <span>Status HTTP: <strong className="text-white">{s.auth.status}</strong></span>
                                    <span>Tempo: <strong className="text-white">{s.auth.duration_ms}ms</strong></span>
                                    <span>Token: <strong className={s.auth.token_received ? 'text-primary' : 'text-red-400'}>{s.auth.token_received ? 'Recebido ✅' : 'NÃO recebido ❌'}</strong></span>
                                </div>
                                <JsonBlock data={s.auth.response} />
                            </>
                        )}
                    </div>

                    {/* Step 2: Currencies */}
                    <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white">2. Busca de Moedas (BRL)</h2>
                            <StatusBadge ok={s.currencies?.ok} />
                        </div>
                        {s.currencies && (
                            <>
                                <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
                                    <span>Status HTTP: <strong className="text-white">{s.currencies.status}</strong></span>
                                    <span>Tempo: <strong className="text-white">{s.currencies.duration_ms}ms</strong></span>
                                    <span>BRL encontrado: <strong className={s.currencies.brl_found ? 'text-primary' : 'text-red-400'}>{s.currencies.brl_found ? 'Sim ✅' : 'Não ❌'}</strong></span>
                                </div>
                                {s.currencies.brl_object && (
                                    <div className="text-xs bg-black/40 rounded-lg p-2 text-gray-300 font-mono">
                                        {JSON.stringify(s.currencies.brl_object)}
                                    </div>
                                )}
                                <JsonBlock data={s.currencies.all_currencies} />
                            </>
                        )}
                    </div>

                    {/* Step 3: Deposit attempt */}
                    <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white">3. Tentativa de Cobrança PIX</h2>
                            <StatusBadge ok={s.deposit_attempt?.ok} />
                        </div>

                        {s.dry_run_payload && (
                            <div className="text-xs space-y-1">
                                <p className="text-gray-500 font-bold uppercase">Payload enviado:</p>
                                <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-gray-300 overflow-x-auto">
                                    {JSON.stringify(s.dry_run_payload, null, 2)}
                                </pre>
                            </div>
                        )}

                        {s.deposit_attempt && (
                            <>
                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                                    <span>Status HTTP: <strong className="text-white">{s.deposit_attempt.status}</strong></span>
                                    <span>Tempo: <strong className="text-white">{s.deposit_attempt.duration_ms}ms</strong></span>
                                </div>

                                {/* QR field detection */}
                                <div className={`rounded-lg p-3 text-xs font-bold border ${s.deposit_attempt.qr_field_found?.startsWith('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                                    Campo QR encontrado: {s.deposit_attempt.qr_field_found}
                                    {s.deposit_attempt.qr_value_preview && (
                                        <div className="font-mono font-normal text-gray-400 mt-1">{s.deposit_attempt.qr_value_preview}</div>
                                    )}
                                </div>

                                {/* Top-level keys */}
                                <div className="text-xs text-gray-500">
                                    <strong className="text-gray-400">Chaves top-level da resposta:</strong>{' '}
                                    <code className="text-yellow-400">{s.deposit_attempt.top_level_keys?.join(', ') || '(nenhuma)'}</code>
                                </div>
                                {s.deposit_attempt.data_keys?.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                        <strong className="text-gray-400">Chaves dentro de .data:</strong>{' '}
                                        <code className="text-yellow-400">{s.deposit_attempt.data_keys.join(', ')}</code>
                                    </div>
                                )}

                                <JsonBlock data={s.deposit_attempt.full_response} />
                            </>
                        )}
                    </div>

                    {/* Webhook note */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-200 space-y-2">
                        <p className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Webhook de Confirmação</p>
                        <p className="text-xs text-yellow-300/80">
                            Para confirmar pagamentos automaticamente, a XGate precisa chamar de volta a URL:<br />
                            <code className="bg-black/40 px-2 py-0.5 rounded">https://app.preditybr.com/api/xgate-debug</code>
                            {' '}(POST)<br />
                            Configure esse endpoint no painel da XGate como Webhook URL.
                            Por enquanto, os logs aparecem no servidor quando um POST chegar aqui.
                        </p>
                    </div>
                </div>
            )}

            {/* Recent Deposit Transactions */}
            <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-white">Últimos Depósitos no Banco</h2>
                    <button onClick={fetchTransactions} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Atualizar
                    </button>
                </div>

                {txLoading ? (
                    <div className="text-center py-6 text-gray-500 text-sm">Carregando...</div>
                ) : txs.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">Nenhum depósito registrado ainda.</div>
                ) : (
                    <div className="space-y-2">
                        {txs.map(tx => (
                            <div key={tx.id} className="bg-black/30 rounded-lg p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-gray-500">{tx.id?.slice(0, 12)}...</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${tx.status === 'COMPLETED' ? 'bg-primary/20 text-primary' :
                                            tx.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                        }`}>{tx.status}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>R$ {Number(tx.amount).toFixed(2)}</span>
                                    <span>{new Date(tx.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                {tx.metadata?.xgate_id && (
                                    <div className="text-gray-600">XGate ID: <code className="text-gray-400">{tx.metadata.xgate_id}</code></div>
                                )}
                                {tx.metadata?.error && (
                                    <div className="text-red-400">Erro: {tx.metadata.error}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
