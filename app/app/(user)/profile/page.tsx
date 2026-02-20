"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    LogOut, Mail, Lock, CheckCircle, AlertCircle, Clock,
    Copy, ArrowDownLeft, ArrowUpRight, Target, TrendingUp,
    Users, Wallet, Camera, Phone, User as UserIcon, History,
    ChevronRight, X, Smartphone, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'overview' | 'data' | 'bets' | 'affiliate';

// CPF auto-mask
const formatCpf = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatCpfDisplay = (v?: string | null) => {
    if (!v) return null;
    const d = v.replace(/\D/g, '');
    if (d.length !== 11) return v;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export default function ProfilePage() {
    const [tab, setTab] = useState<Tab>('overview');
    const [authUser, setAuthUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [bets, setBets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [betFilter, setBetFilter] = useState<'ALL' | 'ACTIVE' | 'WON' | 'LOST'>('ALL');

    // Edit states
    const [nameValue, setNameValue] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [documentValue, setDocumentValue] = useState('');

    // Deposit Modal
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositStep, setDepositStep] = useState(1);
    const [depositAmount, setDepositAmount] = useState('');
    const [pixKey, setPixKey] = useState('');

    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setAuthUser(session.user);

            const [profileRes, betsRes, txRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', session.user.id).single(),
                supabase.from('bets').select('*, markets(title, status)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
                supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50),
            ]);

            if (profileRes.data) {
                setProfile(profileRes.data);
                setNameValue(profileRes.data.full_name || session.user.user_metadata?.full_name || '');
                setDocumentValue(formatCpfDisplay(profileRes.data.document || profileRes.data.cpf) || '');
            }
            if (betsRes.data) setBets(betsRes.data);
            if (txRes.data) setTransactions(txRes.data);

            // Commissions
            const { data: comData } = await supabase
                .from('referral_commissions')
                .select('*, referred:referred_id (email, full_name)')
                .eq('referrer_id', session.user.id)
                .order('created_at', { ascending: false });
            if (comData) setCommissions(comData);

            setLoading(false);
        };
        load();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleSaveName = async () => {
        if (!authUser || !nameValue.trim()) return;
        setSaving(true);
        await supabase.from('users').upsert({ id: authUser.id, email: authUser.email, full_name: nameValue });
        setProfile((p: any) => ({ ...p, full_name: nameValue }));
        setEditingName(false);
        setSaving(false);
    };

    const handleSaveDocument = async () => {
        if (!authUser) return;
        setSaving(true);
        const digits = documentValue.replace(/\D/g, '');
        await supabase.from('users').upsert({ id: authUser.id, email: authUser.email, document: digits });
        setProfile((p: any) => ({ ...p, document: digits }));
        setSaving(false);
    };

    const copyRefLink = () => {
        const code = profile?.referral_code;
        if (!code) return;
        const link = `${window.location.origin}/?ref=${code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openDeposit = () => { setDepositStep(1); setDepositAmount(''); setIsDepositOpen(true); };

    const confirmDepositAmount = async () => {
        const val = parseFloat(depositAmount);
        if (!val || val < 1) { alert('Valor mínimo de R$ 1,00'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: val, userId: authUser.id }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao gerar PIX');
            if (data.qrCode) { setPixKey(data.qrCode); setDepositStep(2); }
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    // Computed stats
    const totalBets = bets.length;
    const activeBets = bets.filter(b => b.status === 'ACTIVE').length;
    const wonBets = bets.filter(b => b.status === 'WON').length;
    const lostBets = bets.filter(b => b.status === 'LOST' || b.status === 'CASHED_OUT').length;
    const hitRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
    const totalInvested = bets.reduce((s, b) => s + (b.amount || 0), 0);
    const totalReturned = bets.filter(b => b.status === 'WON').reduce((s, b) => s + (b.potential_payout || 0), 0);
    const revenue = totalReturned - totalInvested;
    const totalCommission = commissions.reduce((s, c) => s + (c.amount || 0), 0);
    const referralsCount = commissions.length;

    const filteredBets = bets.filter(b => {
        if (betFilter === 'ALL') return true;
        if (betFilter === 'ACTIVE') return b.status === 'ACTIVE';
        if (betFilter === 'WON') return b.status === 'WON';
        if (betFilter === 'LOST') return b.status === 'LOST' || b.status === 'CASHED_OUT';
        return true;
    });

    const memberSince = authUser?.created_at ? new Date(authUser.created_at).getFullYear() : '?';
    const emailVerified = authUser?.email_confirmed_at != null;

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-primary text-lg">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">

            {/* PROFILE HEADER */}
            <div className="bg-surface border border-white/5 rounded-2xl p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 border-2 border-primary/40 flex items-center justify-center overflow-hidden">
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                    : <UserIcon className="w-8 h-8 text-gray-400" />
                                }
                            </div>
                            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors">
                                <Camera className="w-3 h-3 text-black" />
                            </button>
                        </div>

                        {/* Info */}
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg md:text-xl font-bold text-white">
                                    {profile?.full_name || authUser?.user_metadata?.full_name || 'Usuário'}
                                </h1>
                            </div>
                            <p className="text-gray-400 text-sm">{authUser?.email}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" /> Desde {memberSince}
                                </span>
                                <span className={`flex items-center gap-1 text-xs font-bold ${emailVerified ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {emailVerified ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {emailVerified ? 'E-mail verificado' : 'E-mail pendente'}
                                </span>
                                {profile?.phone
                                    ? <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{profile.phone}</span>
                                    : <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />Telefone não cadastrado</span>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="md:text-right space-y-2 flex-shrink-0">
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Saldo em Carteira</div>
                        <div className="text-3xl font-black text-white">R$ {(profile?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <button onClick={openDeposit} className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                            <ArrowDownLeft className="w-4 h-4" /> Depositar
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB NAV */}
            <div className="bg-surface border border-white/5 rounded-xl p-1 flex gap-1 overflow-x-auto scrollbar-hide">
                {([
                    { key: 'overview', label: 'Visão Geral' },
                    { key: 'data', label: 'Meus Dados' },
                    { key: 'bets', label: 'Minhas Previsões' },
                    { key: 'affiliate', label: 'Programa de Afiliados' },
                ] as { key: Tab, label: string }[]).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? (t.key === 'affiliate' ? 'bg-primary text-black' : 'bg-secondary text-white') : 'text-gray-400 hover:text-white'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ===================== TAB CONTENT ===================== */}

            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Previsões', value: totalBets, icon: Target, color: 'text-blue-400' },
                            { label: 'Taxa de Acerto', value: `${hitRate}%`, icon: TrendingUp, color: 'text-green-400' },
                            { label: 'Rendimento', value: `R$ ${revenue.toFixed(2)}`, icon: Wallet, color: revenue >= 0 ? 'text-green-400' : 'text-red-400' },
                            { label: 'Comissões', value: `R$ ${totalCommission.toFixed(2)}`, icon: Users, color: 'text-yellow-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-surface border border-white/5 rounded-xl p-4">
                                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-surface border border-white/5 rounded-xl p-5">
                        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                            <History className="w-4 h-4 text-gray-400" /> Extrato de Movimentação
                        </h2>
                        {transactions.length === 0
                            ? <p className="text-gray-500 text-sm text-center py-8">Nenhuma movimentação ainda.</p>
                            : (
                                <div className="space-y-1">
                                    {transactions.slice(0, 15).map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-full ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {tx.amount > 0 ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-200">{tx.description || tx.type}</p>
                                                    <p className="text-xs text-gray-500">{format(new Date(tx.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                                                </div>
                                            </div>
                                            <span className={`font-mono text-sm font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </div>
            )}

            {tab === 'data' && (
                <div className="bg-surface border border-white/5 rounded-xl p-5 md:p-6 space-y-6">
                    <div>
                        <h2 className="font-bold text-lg text-white mb-1">Meus Dados</h2>
                        <p className="text-sm text-gray-400">Atualize suas informações pessoais.</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Nome</label>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                            {editingName ? (
                                <div className="flex w-full gap-2">
                                    <input type="text" value={nameValue} onChange={e => setNameValue(e.target.value)}
                                        className="bg-transparent flex-1 text-white outline-none" autoFocus />
                                    <button onClick={handleSaveName} disabled={saving} className="text-xs font-bold text-green-400 uppercase px-2">Salvar</button>
                                    <button onClick={() => setEditingName(false)} className="text-xs font-bold text-red-400 uppercase">Cancelar</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-white">
                                        <UserIcon className="w-4 h-4 text-gray-500" />
                                        <span>{profile?.full_name || 'Não informado'}</span>
                                    </div>
                                    <button onClick={() => setEditingName(true)} className="text-xs font-bold text-primary">Editar nome</button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* CPF */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">CPF</label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${profile?.document ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {profile?.document ? 'Vinculado' : 'Não vinculado'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={documentValue}
                                onChange={e => setDocumentValue(formatCpf(e.target.value))}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                className="flex-1 bg-black/30 border border-white/5 rounded-xl p-4 text-white outline-none focus:border-primary/50 transition-colors"
                            />
                            <button onClick={handleSaveDocument} disabled={saving} className="px-4 bg-primary text-black font-bold rounded-xl text-sm">Salvar</button>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">E-mail</label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${emailVerified ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {emailVerified ? 'Verificado' : 'Não verificado'}
                            </span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex items-center gap-2 text-white">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{authUser?.email}</span>
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Telefone</label>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span className={profile?.phone ? '' : 'text-gray-500'}>{profile?.phone || 'Não cadastrado'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-4">
                        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold transition-colors">
                            <LogOut className="w-4 h-4" /> Sair da conta
                        </button>
                    </div>
                </div>
            )}

            {tab === 'bets' && (
                <div className="space-y-4">
                    {/* Filter tabs */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {([
                            { key: 'ALL', label: 'Todas' },
                            { key: 'ACTIVE', label: 'Em Aberto' },
                            { key: 'WON', label: 'Lucros' },
                            { key: 'LOST', label: 'Perdas' },
                        ] as { key: typeof betFilter, label: string }[]).map(f => (
                            <button key={f.key} onClick={() => setBetFilter(f.key)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${betFilter === f.key ? 'bg-primary text-black' : 'bg-surface border border-white/5 text-gray-400 hover:text-white'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {filteredBets.length === 0 ? (
                        <div className="bg-surface border border-white/5 border-dashed rounded-xl py-16 text-center">
                            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="font-bold text-gray-400">Sem previsões ativas</p>
                            <p className="text-sm text-gray-600 mt-1">Explore as oportunidades.</p>
                            <button onClick={() => router.push('/app/markets')} className="mt-4 px-5 py-2 bg-primary text-black font-bold rounded-lg text-sm">Explorar</button>
                        </div>
                    ) : filteredBets.map(bet => (
                        <div key={bet.id} className="bg-surface border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${bet.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' : bet.status === 'WON' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {bet.status === 'ACTIVE' ? 'Em Aberto' : bet.status === 'WON' ? 'Ganhou' : 'Perdeu'}
                                    </span>
                                    <h3 className="font-bold text-white text-sm mt-1 line-clamp-2">{bet.markets?.title}</h3>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ml-2 flex-shrink-0 ${bet.side === 'SIM' || bet.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {bet.side}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500 block">Apostado</span>
                                    <span className="text-white font-bold">R$ {bet.amount.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">ODD</span>
                                    <span className="text-white font-bold">{bet.odds_at_entry?.toFixed(2)}x</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Retorno</span>
                                    <span className="text-green-400 font-bold">R$ {bet.potential_payout?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'affiliate' && (
                <div className="space-y-4">
                    {/* Stats + Ref code */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-surface border border-white/5 rounded-xl p-4 text-center">
                            <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                            <div className="text-xs text-gray-500 mb-1">Indicados</div>
                            <div className="text-2xl font-black text-white">{referralsCount}</div>
                        </div>
                        <div className="bg-surface border border-white/5 rounded-xl p-4 text-center">
                            <Wallet className="w-6 h-6 text-green-400 mx-auto mb-2" />
                            <div className="text-xs text-gray-500 mb-1">Total Ganho</div>
                            <div className="text-2xl font-black text-green-400">R$ {totalCommission.toFixed(2)}</div>
                        </div>
                        <div className="bg-surface border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm mb-1">
                                    ✨ Indique e Ganhe
                                </div>
                                <p className="text-xs text-gray-400">Ganhe <span className="text-green-400 font-bold">15%</span> de comissão no 1º depósito de cada indicado.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white tracking-widest flex-1 text-center">
                                    {profile?.referral_code || '...'}
                                </div>
                                <button onClick={copyRefLink} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${copied ? 'bg-green-500 text-black' : 'bg-primary text-black hover:bg-primary/80'}`}>
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copiado!' : 'Copiar Link'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="bg-surface border border-white/5 rounded-xl p-5">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-400" /> Atividade dos Afiliados
                        </h3>
                        {commissions.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                                <p className="font-bold text-gray-400">Nenhuma atividade</p>
                                <p className="text-sm text-gray-600 mt-1">Compartilhe seu código para começar a ganhar.</p>
                            </div>
                        ) : commissions.map(c => (
                            <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm font-bold text-white">{c.referred?.full_name || c.referred?.email}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })} · 1º depósito</p>
                                </div>
                                <span className="text-green-400 font-bold text-sm">+R$ {c.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DEPOSIT MODAL */}
            {isDepositOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDepositOpen(false)} />
                    <div className="relative bg-surface border-t md:border border-white/10 w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 space-y-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <button onClick={() => setIsDepositOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        {depositStep === 1 ? (
                            <>
                                <div className="text-center space-y-1">
                                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-full mx-auto flex items-center justify-center mb-3"><Smartphone className="w-6 h-6" /></div>
                                    <h3 className="text-xl font-bold text-white">Quanto quer depositar?</h3>
                                    <p className="text-sm text-gray-400">Depósito instantâneo via PIX</p>
                                </div>
                                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                    <label className="text-xs text-gray-500 block mb-1">Valor</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 font-bold">R$</span>
                                        <input type="number" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                                            className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none placeholder-gray-600" placeholder="0,00" autoFocus />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[20, 50, 100, 200].map(val => (
                                        <button key={val} onClick={() => setDepositAmount(val.toString())}
                                            className="py-2 bg-secondary hover:bg-white/5 rounded-lg text-sm font-bold text-gray-300 border border-white/5">+{val}</button>
                                    ))}
                                </div>
                                <button onClick={confirmDepositAmount} className="w-full py-4 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold text-lg">Gerar PIX</button>
                            </>
                        ) : (
                            <>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-white mb-1">Pagamento PIX</h3>
                                    <p className="text-sm text-gray-400">Escaneie o QR Code ou copie a chave</p>
                                </div>
                                <div className="flex justify-center py-2">
                                    <div className="bg-white p-4 rounded-xl">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${pixKey}`} alt="PIX QR" className="w-36 h-36" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input readOnly value={pixKey} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 text-xs text-gray-400 truncate focus:outline-none" />
                                    <button onClick={() => navigator.clipboard.writeText(pixKey)} className="p-3 bg-secondary hover:bg-white/10 rounded-lg text-white"><Copy className="w-4 h-4" /></button>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-500 text-center">Após o pagamento, o saldo será creditado automaticamente.</div>
                                <button onClick={() => setIsDepositOpen(false)} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> Já fiz o Pix
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
