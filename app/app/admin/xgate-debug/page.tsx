"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

// ── ManualSyncForm ────────────────────────────────────────────────────────────
function ManualSyncForm({ users }: { users: any[] }) {
    const [customerId, setCustomerId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [manualCpf, setManualCpf] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const run = async () => {
        if (!customerId.trim()) { alert('Cole o Customer ID da XGate'); return; }
        setSyncing(true);
        setResult(null);
        try {
            const res = await fetch('/api/xgate-sync-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xgateCustomerId: customerId.trim(),
                    userId: selectedUserId || undefined,
                    document: manualCpf || undefined,
                }),
            });
            setResult(await res.json());
        } catch (e: any) {
            setResult({ ok: false, error: e.message });
        }
        setSyncing(false);
    };

    return (
        <div className="space-y-3">
            {/* Customer ID */}
            <div>
                <label className="text-xs text-gray-500 block mb-1">XGate Customer ID <span className="text-amber-400">(copie do painel XGate)</span></label>
                <input
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    placeholder="ex: 6998a9ac43ab146aeadcd00d"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* User dropdown */}
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Usuário (puxa CPF/nome do perfil)</label>
                    <select
                        value={selectedUserId}
                        onChange={e => setSelectedUserId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                        <option value="">— selecione —</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.email} {u.cpf_masked ? `· ${u.cpf_masked}` : '· sem CPF'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Manual CPF override */}
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Ou digite o CPF manualmente (override)</label>
                    <input
                        value={manualCpf}
                        onChange={e => setManualCpf(e.target.value.replace(/\D/g, ''))}
                        placeholder="Somente números: 01234567890"
                        maxLength={11}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                    />
                </div>
            </div>

            <button
                onClick={run}
                disabled={syncing || !customerId.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
                {syncing ? '🔄 Enviando...' : '⚡ Sincronizar este Customer'}
            </button>

            {result && (
                <div className={`rounded-lg border p-4 text-xs space-y-2 ${result.ok ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                        {result.ok ? <span className="text-primary">✅ Sucesso</span> : <span className="text-red-400">❌ Erro</span>}
                        <span className="text-gray-500 font-normal">HTTP {result.http_status}</span>
                    </div>
                    {result.payload_sent && (
                        <div>
                            <p className="text-gray-400 font-bold uppercase mb-1">Payload enviado:</p>
                            <pre className="bg-black/40 rounded p-2 text-gray-300 overflow-x-auto">{JSON.stringify(result.payload_sent, null, 2)}</pre>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-400 font-bold uppercase mb-1">Resposta XGate:</p>
                        <pre className="bg-black/40 rounded p-2 text-gray-300 overflow-x-auto">{JSON.stringify(result.xgate_response || result.error, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── CreateCustomerForm ─────────────────────────────────────────────────────────
function CreateCustomerForm() {
    const [name, setName] = useState('');
    const [document, setDocument] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notValidationDuplicated, setNotValidationDuplicated] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const run = async () => {
        if (!name.trim() || !document.trim()) { alert('Nome e Documento são obrigatórios'); return; }
        setSyncing(true);
        setResult(null);
        try {
            const res = await fetch('/api/xgate-create-customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    document: document.replace(/\D/g, ''),
                    email: email.trim() || undefined,
                    phone: phone.replace(/\D/g, '') || undefined,
                    notValidationDuplicated
                }),
            });
            setResult(await res.json());
        } catch (e: any) {
            setResult({ ok: false, error: e.message });
        }
        setSyncing(false);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Nome *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">CPF/Documento *</label>
                    <input value={document} onChange={e => setDocument(e.target.value)} placeholder="Ex: 01234567890" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: joao@email.com" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Telefone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Apenas números" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50" />
                </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mb-2">
                <input type="checkbox" checked={notValidationDuplicated} onChange={e => setNotValidationDuplicated(e.target.checked)} className="rounded border-white/10 bg-black/40 text-purple-600 focus:ring-purple-500/50" />
                <span className="select-none">notValidationDuplicated <i className="text-gray-500">(enviar param para ignorar duplicidade)</i></span>
            </label>

            <button onClick={run} disabled={syncing || !name.trim() || !document.trim()} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-lg disabled:opacity-50 flex items-center gap-2">
                {syncing ? '🔄 Consumindo API...' : '➕ Testar POST /customer'}
            </button>

            {result && (
                <div className={`rounded-lg border p-4 text-xs space-y-2 mt-4 ${result.ok ? 'bg-primary/10 border-primary/20' : result.http_status === 409 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                        {result.ok ? <span className="text-primary">✅ POST 201 Sucesso</span> : result.http_status === 409 ? <span className="text-yellow-400">⚠️ POST 409 Conflict</span> : <span className="text-red-400">❌ Erro</span>}
                        <span className="text-gray-500 font-normal">HTTP {result.http_status}</span>
                    </div>
                    {result.payload_sent && (
                        <div>
                            <p className="text-gray-400 font-bold uppercase mb-1">Payload enviado:</p>
                            <pre className="bg-black/40 rounded p-2 text-gray-300 overflow-x-auto">{JSON.stringify(result.payload_sent, null, 2)}</pre>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-400 font-bold uppercase mb-1">Resposta XGate:</p>
                        <pre className="bg-black/40 rounded p-2 text-gray-300 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result.xgate_response || result.error, null, 2)}</pre>
                    </div>
                </div>
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
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userDetail, setUserDetail] = useState<any>(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [discoverResult, setDiscoverResult] = useState<any>(null);
    const [discovering, setDiscovering] = useState(false);

    const runDiscover = async () => {
        setDiscovering(true);
        setDiscoverResult(null);
        try {
            const res = await fetch('/api/xgate-discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: users[0]?.email }),
            });
            setDiscoverResult(await res.json());
        } catch (e: any) {
            setDiscoverResult({ error: e.message });
        }
        setDiscovering(false);
    };

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

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await fetch('/api/deposit-debug');
            const data = await res.json();
            setUsers(data.users || []);
        } catch { }
        setUsersLoading(false);
    };

    const inspectUser = async (userId: string) => {
        setUserDetailLoading(true);
        setUserDetail(null);
        try {
            const res = await fetch(`/api/deposit-debug?userId=${userId}`);
            setUserDetail(await res.json());
        } catch { }
        setUserDetailLoading(false);
    };

    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);

    const runSyncAll = async () => {
        if (!confirm('Sincronizar TODOS os usuários com xgate_customer_id na XGate?\nIsto vai chamar PUT /customer/{id} para cada um.')) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/xgate-sync-all', { method: 'POST' });
            setSyncResult(await res.json());
        } catch (e: any) {
            setSyncResult({ error: e.message });
        }
        setSyncing(false);
    };

    const s = report?.steps || {};
    const filteredUsers = users.filter((u: any) =>
        !userSearch ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 pt-8 pb-32">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">🔍 PIX Debug — XGate</h1>
                    <p className="text-xs text-gray-500 mt-1">Página oculta de diagnóstico — não indexada</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={runDiscover}
                        disabled={discovering}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                    >
                        <Search className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
                        {discovering ? 'Sondando XGate...' : '🔍 Descobrir Customer IDs'}
                    </button>
                    <button
                        onClick={runSyncAll}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : '🔄 Forçar Sync XGate (todos)'}
                    </button>
                    <button
                        onClick={() => { runDiagnostic(); fetchTransactions(); fetchUsers(); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/85 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Re-rodar Diagnóstico
                    </button>
                </div>
            </div>

            {/* Discovery Result */}
            {discoverResult && (
                <div className="bg-surface border border-blue-500/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-white">🔍 Resultado da Sondagem XGate</h2>
                        <button onClick={() => setDiscoverResult(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                    </div>
                    {discoverResult.error ? (
                        <p className="text-red-400 text-sm">{discoverResult.error}</p>
                    ) : (
                        <div className="space-y-3">
                            {/* Summary */}
                            {discoverResult.summary && (
                                <div className={`rounded-lg p-3 text-sm font-bold border ${discoverResult.summary.startsWith('✅')
                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                                    }`}>{discoverResult.summary}</div>
                            )}

                            {/* Customer lookup per transaction ID */}
                            {discoverResult.report?.customer_lookup_by_transaction_id?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">GET /customer/{'{' + 'transaction_id}'}:</p>
                                    <div className="space-y-2">
                                        {discoverResult.report.customer_lookup_by_transaction_id.map((r: any, i: number) => (
                                            <div key={i} className={`rounded-lg p-3 text-xs space-y-2 border ${r.try_as_customer_id?.['GET /customer/{id}']?.ok
                                                ? 'bg-primary/10 border-primary/20'
                                                : 'bg-black/30 border-white/5'
                                                }`}>
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <code className="text-gray-400">{r.xgate_transaction_id}</code>
                                                    <span className={`font-bold ${r.try_as_customer_id?.['GET /customer/{id}']?.ok ? 'text-primary' : 'text-red-400'
                                                        }`}>
                                                        HTTP {r.try_as_customer_id?.['GET /customer/{id}']?.status}
                                                    </span>
                                                </div>
                                                {r.try_as_customer_id?.customer_data && (
                                                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                                                        <div className="bg-black/30 rounded p-1.5">
                                                            <span className="text-gray-500">Email:</span>
                                                            <div className="text-white font-bold break-all">{r.try_as_customer_id.customer_data.email || '—'}</div>
                                                        </div>
                                                        <div className="bg-black/30 rounded p-1.5">
                                                            <span className="text-gray-500">Nome:</span>
                                                            <div className="text-white">{r.try_as_customer_id.customer_data.name || '—'}</div>
                                                        </div>
                                                        <div className="bg-black/30 rounded p-1.5">
                                                            <span className="text-gray-500">CPF na XGate:</span>
                                                            <div className={`font-bold ${r.try_as_customer_id.customer_data.document === '12345678909' || r.try_as_customer_id.customer_data.document === '00000000000'
                                                                ? 'text-red-400' : 'text-primary'
                                                                }`}>{r.try_as_customer_id.customer_data.document || '—'}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Endpoint scan — only simple objects */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Endpoints testados:</p>
                                <div className="space-y-1">
                                    {Object.entries(discoverResult.report || {})
                                        .filter(([k, v]) => k !== 'customer_lookup_by_transaction_id' && !Array.isArray(v))
                                        .map(([endpoint, result]: any) => (
                                            <div key={endpoint} className="flex items-center justify-between text-xs bg-black/20 rounded p-2">
                                                <code className="text-gray-400">{endpoint}</code>
                                                <span className={`font-bold ${result.ok ? 'text-primary' : 'text-red-400'}`}>HTTP {result.status}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                            <JsonBlock data={discoverResult.report} />
                        </div>
                    )}
                </div>
            )}

            {/* Sync All Result */}
            {syncResult && (
                <div className={`rounded-xl border p-5 space-y-3 text-sm ${syncResult.error ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-white/5'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-white">Resultado do Sync em Lote</h2>
                        <button onClick={() => setSyncResult(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                    </div>
                    {syncResult.error ? (
                        <p className="text-red-400">{syncResult.error}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-4 gap-3 text-center text-xs">
                                {[['Total', syncResult.total, 'text-white'], ['Sincronizados', syncResult.synced, 'text-primary'], ['Bloqueados', syncResult.locked, 'text-yellow-400'], ['Erros', syncResult.errors, 'text-red-400']].map(([label, val, cls]: any) => (
                                    <div key={label} className="bg-black/30 rounded-lg p-3">
                                        <div className={`text-2xl font-black ${cls}`}>{val ?? 0}</div>
                                        <div className="text-gray-500 mt-0.5">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {syncResult.results?.map((r: any, i: number) => (
                                    <div key={i} className={`text-xs rounded-lg p-3 space-y-1.5 border ${r.status === 'synced' ? 'bg-primary/10 border-primary/20'
                                        : r.status === 'locked' ? 'bg-yellow-500/5 border-yellow-500/20'
                                            : r.status === 'error' ? 'bg-red-500/10 border-red-500/20'
                                                : 'bg-black/20 border-white/5'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white">{r.email}</span>
                                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${r.status === 'synced' ? 'text-primary bg-primary/20'
                                                : r.status === 'locked' ? 'text-yellow-400 bg-yellow-500/10'
                                                    : r.status === 'error' ? 'text-red-400 bg-red-500/10'
                                                        : 'text-gray-500'
                                                }`}>
                                                {r.status === 'synced' ? '✅ sync'
                                                    : r.status === 'locked' ? '🔒 bloqueado'
                                                        : r.status === 'error' ? `❌ erro HTTP ${r.http_status}`
                                                            : `⏭ ${r.reason || 'skipped'}`}
                                            </span>
                                        </div>
                                        {/* CPF sent + XGate response */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-black/30 rounded p-2">
                                                <span className="text-gray-500">CPF enviado:</span>
                                                <code className="block text-white font-bold mt-0.5">
                                                    {r.payload_sent?.document || '❌ não enviado'}
                                                </code>
                                            </div>
                                            <div className="bg-black/30 rounded p-2">
                                                <span className="text-gray-500">XGate respondeu:</span>
                                                <code className="block text-sm mt-0.5">
                                                    {r.xgate_message || r.error || '(sem mensagem)'}
                                                </code>
                                            </div>
                                        </div>
                                        {r.customer_id && (
                                            <div className="text-gray-600">Customer ID: {r.customer_id}</div>
                                        )}
                                        {r.note && (
                                            <div className="text-yellow-400">{r.note}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* ── MANUAL SYNC PANEL ── */}
                <div className="bg-surface border border-amber-500/20 rounded-xl p-5 space-y-4">
                    <div>
                        <h2 className="font-bold text-white">🔧 Sync Manual por Customer ID</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Para usuários sem ID capturado: cole o Customer ID do painel XGate e selecione o usuário.
                        </p>
                    </div>

                    <ManualSyncForm users={users} />
                </div>

                {/* ── CREATE CUSTOMER TEST PANEL ── */}
                <div className="bg-surface border border-purple-500/20 rounded-xl p-5 space-y-4">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">➕ Testar Criação (POST /customer)</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Suporte da XGate sugeriu que tentar criar com mesmo Nome/CPF deve retornar erro 409 + o ID do cliente.
                        </p>
                    </div>

                    <CreateCustomerForm />
                </div>
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
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-200 space-y-2">
                        <p className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /> ⚠️ Ação necessária: Atualizar Webhook no XGate</p>
                        <p className="text-xs text-red-300/80">
                            A URL de webhook atual (<code className="bg-black/40 px-1 rounded">/api/xgate-debug</code>) só faz eco.
                            <strong className="text-white"> Vá ao painel XGate e troque a URL do Webhook para:</strong>
                        </p>
                        <code className="block bg-black/60 border border-red-500/20 px-3 py-2 rounded-lg text-primary font-mono text-xs break-all select-all">
                            https://app.preditybr.com/api/xgate-webhook
                        </code>
                        <p className="text-xs text-red-300/60">
                            Essa nova URL processa o pagamento: encontra a transação PENDING por xgate_id e credita o saldo do usuário automaticamente.
                        </p>
                    </div>
                </div>
            )}

            {/* ── USERS CPF PANEL ── */}
            <div className="bg-surface border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-white">👤 Usuários — CPF & Status PIX</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Mostra exatamente o que seria enviado à XGate para cada usuário</p>
                    </div>
                    <button onClick={fetchUsers} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Atualizar
                    </button>
                </div>

                {/* search */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Buscar por e-mail ou nome..."
                        className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-primary/40"
                    />
                </div>

                {usersLoading ? (
                    <div className="text-center py-6 text-gray-500 text-sm">Carregando usuários...</div>
                ) : (
                    <div className="space-y-2">
                        {filteredUsers.map(u => (
                            <div key={u.id}
                                className={`rounded-lg border p-3 text-xs cursor-pointer transition-all ${u.is_test_cpf ? 'bg-red-500/10 border-red-500/30' : u.ready_to_deposit ? 'bg-black/30 border-white/5 hover:border-primary/30' : 'bg-yellow-500/5 border-yellow-500/20'}`}
                                onClick={() => { setSelectedUser(u); inspectUser(u.id); }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-white">{u.full_name || '(sem nome)'}</span>
                                        <span className="text-gray-500 ml-2">{u.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {u.is_test_cpf && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">🚨 CPF TESTE</span>}
                                        {!u.is_test_cpf && !u.cpf_valid && u.cpf_raw_length > 0 && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">CPF INVÁLIDO</span>}
                                        {u.ready_to_deposit && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">✅ PRONTO</span>}
                                        {!u.ready_to_deposit && !u.is_test_cpf && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold">⚠️ BLOQUEADO</span>}
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-1.5 text-gray-500">
                                    <span>CPF: <code className="text-gray-300">{u.cpf_masked}</code></span>
                                    <span>Saldo: <code className="text-gray-300">{formatCurrency(u.balance)}</code></span>
                                    {u.cpf_error && <span className="text-red-400">{u.cpf_error}</span>}
                                    {u.name_error && <span className="text-yellow-400">{u.name_error}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* User detail drill-down */}
                {selectedUser && (
                    <div className="mt-4 bg-black/40 border border-primary/20 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm">Detalhes: {selectedUser.email}</h3>
                            <button onClick={() => { setSelectedUser(null); setUserDetail(null); }} className="text-gray-500 hover:text-white text-xs">✕ Fechar</button>
                        </div>

                        {userDetailLoading && <div className="text-gray-500 text-xs text-center py-4">Carregando...</div>}

                        {userDetail && !userDetailLoading && (
                            <div className="space-y-3">
                                {/* CPF Analysis */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Análise CPF</p>
                                    {userDetail.cpf_analysis?.is_test_cpf && (
                                        <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-300 text-xs font-bold">
                                            🚨 CPF DE TESTE DETECTADO — XGate irá rejeitar toda tentativa de cobrança com este CPF.
                                            O usuário precisa atualizar o CPF no Perfil.
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-black/30 rounded-lg p-2">
                                            <span className="text-gray-500">CPF armazenado:</span>
                                            <code className="block text-white mt-0.5">{userDetail.cpf_analysis?.masked}</code>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2">
                                            <span className="text-gray-500">Checksum válido:</span>
                                            <span className={`block font-bold mt-0.5 ${userDetail.cpf_analysis?.checksum_valid ? 'text-primary' : 'text-red-400'}`}>
                                                {userDetail.cpf_analysis?.checksum_valid ? '✅ Sim' : `❌ Não — ${userDetail.cpf_analysis?.checksum_error}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* XGate payload preview */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">Payload exato que seria enviado à XGate</p>
                                    <pre className="bg-black/60 border border-white/5 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                                        {JSON.stringify(userDetail.xgate_payload_preview, null, 2)}
                                    </pre>
                                </div>

                                {/* Recent deposits for this user */}
                                {userDetail.recent_deposits?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">Últimos depósitos deste usuário</p>
                                        <div className="space-y-1.5">
                                            {userDetail.recent_deposits.map((tx: any) => (
                                                <div key={tx.id} className="flex items-center justify-between bg-black/30 rounded-lg p-2 text-xs">
                                                    <span className="text-gray-400">{new Date(tx.created_at).toLocaleString('pt-BR')}</span>
                                                    <span className="text-white font-bold">{formatCurrency(tx.amount)}</span>
                                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${tx.status === 'COMPLETED' ? 'bg-primary/20 text-primary' : tx.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{tx.status}</span>
                                                    {tx.metadata?.xgate_id && <code className="text-gray-600">{tx.metadata.xgate_id.slice(0, 12)}...</code>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

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
                                    <span>{formatCurrency(tx.amount)}</span>
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
