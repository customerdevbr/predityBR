"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { validateCpf, validateFullName } from '@/lib/cpf';
import RankingsList from '@/components/RankingsList';
import BlogListClient from '@/components/BlogListClient';
import {
    LogOut, Mail, CheckCircle, AlertCircle, Clock,
    Copy, ArrowDownLeft, ArrowUpRight, Target, TrendingUp,
    Users, Wallet, Camera, Phone, User as UserIcon, History,
    X, Smartphone, Check, Lock, Eye, EyeOff, Trophy, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'overview' | 'data' | 'bets' | 'affiliate' | 'ranking' | 'blog';

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
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit states
    const [nameValue, setNameValue] = useState('');
    const [nameError, setNameError] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [documentValue, setDocumentValue] = useState('');
    const [documentError, setDocumentError] = useState('');

    // Password states
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [passSaving, setPassSaving] = useState(false);

    // Deposit Modal
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositStep, setDepositStep] = useState(1);
    const [depositAmount, setDepositAmount] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);

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
        if (!authUser) return;
        const check = validateFullName(nameValue);
        if (!check.valid) { setNameError(check.error || 'Nome inválido.'); return; }
        setNameError('');
        setSaving(true);
        await supabase.from('users').upsert({ id: authUser.id, email: authUser.email, full_name: nameValue.trim() });
        setProfile((p: any) => ({ ...p, full_name: nameValue.trim() }));
        setEditingName(false);
        // Sync to XGate (best-effort — doesn't block UI)
        fetch('/api/xgate-sync-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authUser.id }),
        }).then(r => r.json()).then(d => {
            if (!d.ok && !d.skipped) console.warn('[profile] XGate sync failed:', d);
            else console.log('[profile] XGate sync:', d.message || d.reason);
        }).catch(console.warn);
        setSaving(false);
    };

    const handleSaveDocument = async () => {
        if (!authUser) return;
        const check = validateCpf(documentValue);
        if (!check.valid) { setDocumentError(check.error || 'CPF inválido.'); return; }
        setDocumentError('');
        setSaving(true);
        const digits = documentValue.replace(/\D/g, '');
        await supabase.from('users').upsert({ id: authUser.id, email: authUser.email, document: digits });
        setProfile((p: any) => ({ ...p, document: digits }));
        // Sync updated CPF to XGate — THIS is the key fix for the test CPF problem
        const syncRes = await fetch('/api/xgate-sync-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authUser.id }),
        }).then(r => r.json()).catch(() => ({ ok: false }));
        if (!syncRes.ok && !syncRes.skipped) {
            console.warn('[profile] XGate CPF sync failed:', syncRes);
            // Show a subtle warning but don't block — user's local profile is saved
            setDocumentError(`CPF salvo localmente. Sincronização XGate: ${syncRes.error || 'pendente'}`);
        } else {
            console.log('[profile] XGate CPF sync:', syncRes.message || syncRes.reason);
        }
        setSaving(false);
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !authUser) return;
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', authUser.id);
            const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload falhou');
            setProfile((p: any) => ({ ...p, avatar_url: data.avatarUrl }));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleChangePassword = async () => {
        if (!newPass || newPass.length < 6) { alert('Senha deve ter pelo menos 6 caracteres.'); return; }
        if (newPass !== confirmPass) { alert('As senhas não coincidem.'); return; }
        setPassSaving(true);
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) { alert('Erro: ' + error.message); }
        else { alert('Senha atualizada com sucesso!'); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }
        setPassSaving(false);
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
        if (!val || val < 10) { alert('Valor mínimo de depósito: R$ 10,00'); return; }
        setDepositLoading(true);
        try {
            const res = await fetch('/api/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: val, userId: authUser.id }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao gerar PIX');
            if (data.qrCode) { setPixKey(data.qrCode); setDepositStep(2); }
        } catch (err: any) { alert(err.message); } finally { setDepositLoading(false); }
    };

    // Stats
    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === 'WON').length;
    const hitRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
    const totalInvested = bets.reduce((s, b) => s + (b.amount || 0), 0);
    const totalReturned = bets.filter(b => b.status === 'WON').reduce((s, b) => s + (b.potential_payout || 0), 0);
    const revenue = totalReturned - totalInvested;
    const totalCommission = commissions.reduce((s, c) => s + (c.amount || 0), 0);

    const filteredBets = bets.filter(b => {
        if (betFilter === 'ALL') return true;
        if (betFilter === 'ACTIVE') return b.status === 'ACTIVE';
        if (betFilter === 'WON') return b.status === 'WON';
        if (betFilter === 'LOST') return b.status === 'LOST' || b.status === 'CASHED_OUT';
        return true;
    });

    const memberSince = authUser?.created_at ? new Date(authUser.created_at).getFullYear() : '?';
    const emailVerified = authUser?.email_confirmed_at != null;
    const balance = profile?.balance || 0;

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Carregando perfil...</span>
            </div>
        </div>
    );

    const TABS = [
        { key: 'overview' as Tab, label: 'Visão Geral' },
        { key: 'data' as Tab, label: 'Meus Dados' },
        { key: 'bets' as Tab, label: 'Minhas Previsões' },
        { key: 'affiliate' as Tab, label: 'Programa de Afiliados' },
        { key: 'ranking' as Tab, label: 'Ranking Geral' },
        { key: 'blog' as Tab, label: 'Blog & Dicas' },
    ];

    return (
        <div className="max-w-4xl mx-auto pb-24 space-y-0">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            {/* ================================================ */}
            {/* HEADER CARD */}
            {/* ================================================ */}
            <div
                className="rounded-2xl border border-white/5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #10161e 0%, #0f1115 60%, #0a110a 100%)' }}
            >
                {/* Top green accent bar */}
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #04B305, #6eff6e, #04B305)' }} />

                <div className="p-5 md:p-7">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                        {/* Left: Avatar + Info */}
                        <div className="flex items-center gap-4 md:gap-5">
                            {/* Avatar */}
                            <button
                                onClick={handleAvatarClick}
                                disabled={uploadingAvatar}
                                className="relative flex-shrink-0 group"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_20px_rgba(47,124,70,0.3)]">
                                    {uploadingAvatar ? (
                                        <div className="w-full h-full bg-black/60 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full bg-[#1a2a1a] flex items-center justify-center group-hover:bg-[#1e301e] transition-colors">
                                            <UserIcon className="w-8 h-8 text-primary/60" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-[#0f1115] shadow group-hover:bg-primary/80 transition-colors">
                                    <Camera className="w-3 h-3 text-white" />
                                </div>
                            </button>

                            {/* Info */}
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-xl font-black text-white truncate">
                                    {profile?.full_name || authUser?.user_metadata?.full_name || 'Usuário'}
                                </h1>
                                <p className="text-sm text-gray-400 truncate">{authUser?.email}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                        <Clock className="w-3 h-3" /> Desde {memberSince}
                                    </span>
                                    <span className="text-gray-700">•</span>
                                    <span className={`flex items-center gap-1 text-[10px] font-bold ${emailVerified ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {emailVerified
                                            ? <><CheckCircle className="w-3 h-3" />E-mail verificado</>
                                            : <><AlertCircle className="w-3 h-3" />E-mail pendente</>
                                        }
                                    </span>
                                    <span className="text-gray-700">•</span>
                                    <span className={`flex items-center gap-1 text-[10px] font-medium ${profile?.phone ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <Phone className="w-3 h-3" />
                                        {profile?.phone || 'Telefone não cadastrado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Balance */}
                        <div className="flex flex-row sm:flex-col sm:items-end gap-3 sm:gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5 sm:text-right">Saldo em Carteira</p>
                                <p className="text-2xl md:text-3xl font-black text-white sm:text-right">
                                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                onClick={openDeposit}
                                className="flex items-center gap-1.5 bg-primary hover:bg-primary/80 active:bg-primary/70 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-[0_0_16px_rgba(47,124,70,0.4)] hover:shadow-[0_0_24px_rgba(47,124,70,0.5)] whitespace-nowrap"
                            >
                                <ArrowDownLeft className="w-4 h-4" /> Depositar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================ */}
            {/* TAB NAVIGATION */}
            {/* ================================================ */}
            <div className="flex gap-0 border-b border-white/5 mt-0 overflow-x-auto scrollbar-hide bg-[#0d121a]">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`relative px-4 py-3.5 text-sm font-bold whitespace-nowrap transition-all ${tab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t.label}
                        {tab === t.key && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                        )}
                        {t.key === 'affiliate' && tab === t.key && (
                            <span className="ml-1.5 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">15%</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ================================================ */}
            {/* TAB CONTENT */}
            {/* ================================================ */}
            <div className="pt-6 space-y-4">

                {/* ── VISÃO GERAL ── */}
                {tab === 'overview' && (
                    <div className="space-y-5">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Previsões', value: totalBets.toString(), Icon: Target, accent: '#60a5fa' },
                                { label: 'Taxa de Acerto', value: `${hitRate}%`, Icon: TrendingUp, accent: '#04B305' },
                                { label: 'Rendimento', value: `R$ ${revenue.toFixed(2)}`, Icon: Wallet, accent: revenue >= 0 ? '#04B305' : '#f87171' },
                                { label: 'Comissões', value: `R$ ${totalCommission.toFixed(2)}`, Icon: Users, accent: '#facc15' },
                            ].map(s => (
                                <div key={s.label} className="bg-[#0d121a] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                                        <s.Icon className="w-4 h-4" style={{ color: s.accent }} />
                                    </div>
                                    <div className="text-xl font-black" style={{ color: s.accent }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Extrato */}
                        <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-500" />
                                <span className="font-bold text-white text-sm">Extrato de Movimentação</span>
                            </div>
                            {transactions.length === 0 ? (
                                <div className="py-12 text-center text-gray-600">Nenhuma movimentação ainda.</div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {transactions.slice(0, 15).map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                                    {tx.amount > 0
                                                        ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                                                        : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-200">{tx.description || tx.type}</p>
                                                    <p className="text-xs text-gray-600">{format(new Date(tx.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-black font-mono ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MEUS DADOS ── */}
                {tab === 'data' && (
                    <div className="space-y-4">
                        <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="font-bold text-white">Meus Dados</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Atualize seu nome, e-mail e telefone.</p>
                            </div>

                            <div className="divide-y divide-white/5">
                                {/* Name */}
                                <div className="px-5 py-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nome</label>
                                    {editingName ? (
                                        <div className="space-y-1.5">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text" value={nameValue}
                                                    onChange={e => { setNameValue(e.target.value); setNameError(''); }}
                                                    autoFocus
                                                    placeholder="Nome Completo"
                                                    className={`flex-1 bg-black/40 border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary ${nameError ? 'border-red-500/60' : 'border-primary/40'}`}
                                                />
                                                <button onClick={handleSaveName} disabled={saving} className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg">{saving ? '...' : 'Salvar'}</button>
                                                <button onClick={() => { setEditingName(false); setNameError(''); }} className="px-3 py-2 bg-white/5 text-gray-400 text-xs font-bold rounded-lg">Cancelar</button>
                                            </div>
                                            {nameError && (
                                                <p className="text-xs text-red-400 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {nameError}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-600">Informe nome e sobrenome exatamente como no seu CPF.</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 text-gray-600" />
                                                <span className="text-white text-sm">{profile?.full_name || 'Não informado'}</span>
                                            </div>
                                            <button onClick={() => setEditingName(true)} className="text-xs font-bold text-primary hover:text-primary/80">Editar nome</button>
                                        </div>
                                    )}
                                </div>

                                {/* CPF */}
                                <div className="px-5 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CPF</label>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profile?.document ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {profile?.document ? '✓ Vinculado' : 'Não vinculado'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={documentValue}
                                            onChange={e => { setDocumentValue(formatCpf(e.target.value)); setDocumentError(''); }}
                                            placeholder="000.000.000-00"
                                            maxLength={14}
                                            className={`flex-1 bg-black/40 border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary/50 transition-colors ${documentError ? 'border-red-500/60' : 'border-white/5'}`}
                                        />
                                        <button onClick={handleSaveDocument} disabled={saving} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/80 transition-colors">
                                            {saving ? '...' : 'Salvar'}
                                        </button>
                                    </div>
                                    {documentError && (
                                        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {documentError}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-600 mt-1">Deve ser o mesmo CPF vinculado à sua conta PIX.</p>
                                </div>

                                {/* Email */}
                                <div className="px-5 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emailVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {emailVerified ? 'Verificado' : 'Não verificado'}
                                        </span>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-600" />
                                        <span className="text-white text-sm">{authUser?.email}</span>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="px-5 py-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Telefone</label>
                                    <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-600" />
                                        <span className={`text-sm ${profile?.phone ? 'text-white' : 'text-gray-600'}`}>
                                            {profile?.phone || 'Não cadastrado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="font-bold text-white">Alterar Senha</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Para sua segurança, informe uma senha forte.</p>
                            </div>
                            <div className="p-5 space-y-3">
                                {[
                                    { label: 'Nova senha', val: newPass, set: setNewPass },
                                    { label: 'Confirmar nova senha', val: confirmPass, set: setConfirmPass },
                                ].map(f => (
                                    <div key={f.label}>
                                        <label className="text-xs text-gray-500 block mb-1.5">{f.label}</label>
                                        <div className="relative">
                                            <input
                                                type={showPass ? 'text' : 'password'}
                                                value={f.val}
                                                onChange={e => f.set(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2.5 pr-10 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                                            />
                                            <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={handleChangePassword}
                                    disabled={passSaving || !newPass}
                                    className="w-full py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-colors mt-1"
                                >
                                    {passSaving ? 'Salvando...' : 'Atualizar senha'}
                                </button>
                            </div>
                        </div>

                        {/* Logout */}
                        <div className="px-1">
                            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold transition-colors">
                                <LogOut className="w-4 h-4" /> Sair da conta
                            </button>
                        </div>
                    </div>
                )}

                {/* ── MINHAS PREVISÕES ── */}
                {tab === 'bets' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {([
                                { key: 'ALL', label: 'Todas' },
                                { key: 'ACTIVE', label: 'Em Aberto' },
                                { key: 'WON', label: 'Lucros' },
                                { key: 'LOST', label: 'Perdas' },
                            ] as { key: typeof betFilter; label: string }[]).map(f => (
                                <button key={f.key} onClick={() => setBetFilter(f.key)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${betFilter === f.key ? 'bg-primary text-white border-primary shadow-[0_0_12px_rgba(47,124,70,0.4)]' : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filteredBets.length === 0 ? (
                            <div className="bg-[#0d121a] border border-dashed border-white/10 rounded-xl py-16 text-center">
                                <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                                <p className="font-bold text-gray-500">Sem previsões ativas</p>
                                <p className="text-xs text-gray-700 mt-1">Explore as oportunidades.</p>
                                <button onClick={() => router.push('/app/markets')} className="mt-4 px-5 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary/80 transition-colors">Explorar</button>
                            </div>
                        ) : filteredBets.map(bet => (
                            <div key={bet.id} className="bg-[#0d121a] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0 pr-3">
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-1.5 ${bet.status === 'ACTIVE' ? 'bg-blue-500/15 text-blue-400' : bet.status === 'WON' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                            {bet.status === 'ACTIVE' ? 'Em Aberto' : bet.status === 'WON' ? 'Acertou' : 'Perdeu'}
                                        </span>
                                        <h3 className="font-bold text-white text-sm line-clamp-2">{bet.markets?.title}</h3>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black flex-shrink-0 ${bet.side === 'SIM' || bet.side === 'YES' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                        {bet.side}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Apostado', val: `R$ ${bet.amount.toFixed(2)}`, color: 'text-gray-300' },
                                        { label: 'ODD', val: `${bet.odds_at_entry?.toFixed(2)}x`, color: 'text-gray-300' },
                                        { label: 'Retorno', val: `R$ ${bet.potential_payout?.toFixed(2)}`, color: 'text-emerald-400' },
                                    ].map(s => (
                                        <div key={s.label}>
                                            <span className="text-[10px] text-gray-600 block mb-0.5">{s.label}</span>
                                            <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PROGRAMA DE AFILIADOS ── */}
                {tab === 'affiliate' && (
                    <div className="space-y-4">
                        {/* Stats row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-[#0d121a] border border-white/5 rounded-xl p-5 text-center">
                                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                <div className="text-xs text-gray-500 mb-1">Indicados</div>
                                <div className="text-2xl font-black text-white">{commissions.length}</div>
                            </div>
                            <div className="bg-[#0d121a] border border-white/5 rounded-xl p-5 text-center">
                                <Wallet className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                <div className="text-xs text-gray-500 mb-1">Total Ganho</div>
                                <div className="text-2xl font-black text-emerald-400">R$ {totalCommission.toFixed(2)}</div>
                            </div>

                            {/* Ref box */}
                            <div className="bg-[#0d121a] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                                <div>
                                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                                        ✨ Indique e Ganhe
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Ganhe <span className="text-emerald-400 font-bold">15%</span> no 1º depósito de cada indicado.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-center font-mono font-black text-white tracking-widest text-sm">
                                        {profile?.referral_code || '...'}
                                    </div>
                                    <button
                                        onClick={copyRefLink}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/80'}`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copiado!' : 'Copiar Link'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Activity */}
                        <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold text-white text-sm">Atividade dos Afiliados</span>
                            </div>
                            {commissions.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <p className="font-bold text-gray-500">Nenhuma atividade</p>
                                    <p className="text-xs text-gray-700 mt-1">Compartilhe seu código para começar a ganhar.</p>
                                </div>
                            ) : commissions.map(c => (
                                <div key={c.id} className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-white">{c.referred?.full_name || c.referred?.email}</p>
                                        <p className="text-xs text-gray-600">{format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })} · 1º depósito</p>
                                    </div>
                                    <span className="text-emerald-400 font-black text-sm">+R$ {c.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── RANKING GERAL ── */}
                {tab === 'ranking' && (
                    <div className="space-y-4">
                        <RankingsList isAuthed={true} />
                    </div>
                )}

                {/* ── BLOG & DICAS ── */}
                {tab === 'blog' && (
                    <div className="space-y-4">
                        <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Artigos e Dicas</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Mantenha-se informado para fazer previsões melhores.</p>
                                </div>
                            </div>

                            <BlogListClient />
                        </div>
                    </div>
                )}
            </div>

            {/* ================================================ */}
            {/* DEPOSIT MODAL */}
            {/* ================================================ */}
            {isDepositOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setIsDepositOpen(false)} />
                    <div className="relative bg-[#0d121a] border-t md:border border-white/10 w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <button onClick={() => setIsDepositOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        {depositStep === 1 ? (
                            <>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                                        <Smartphone className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black text-white">Quanto quer depositar?</h3>
                                    <p className="text-sm text-gray-500 mt-1">Depósito instantâneo via PIX</p>
                                </div>
                                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                                    <label className="text-xs text-gray-600 block mb-1">Valor</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 font-bold text-xl">R$</span>
                                        <input type="number" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                                            className="bg-transparent text-3xl font-black text-white w-full focus:outline-none" placeholder="0,00" autoFocus />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[20, 50, 100, 200].map(v => (
                                        <button key={v} onClick={() => setDepositAmount(v.toString())}
                                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-bold text-gray-300 transition-colors">
                                            +{v}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={confirmDepositAmount} disabled={depositLoading}
                                    className="w-full py-4 bg-primary hover:bg-primary/80 text-white font-black text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(47,124,70,0.3)] disabled:opacity-50">
                                    {depositLoading ? 'Gerando...' : 'Gerar PIX'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-white">Pagamento PIX</h3>
                                    <p className="text-sm text-gray-500 mt-1">Escaneie o QR Code ou copie a chave</p>
                                </div>
                                <div className="flex justify-center">
                                    <div className="bg-white p-4 rounded-xl">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${pixKey}`} alt="PIX QR" className="w-40 h-40" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input readOnly value={pixKey} className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 text-xs text-gray-400 truncate outline-none" />
                                    <button onClick={() => navigator.clipboard.writeText(pixKey)} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"><Copy className="w-4 h-4" /></button>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-500 text-center">
                                    Após o pagamento, o saldo será creditado automaticamente.
                                </div>
                                <button onClick={() => setIsDepositOpen(false)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 transition-colors">
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
