"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Upload, Trash2, AlertTriangle, CheckCircle, Ban, XCircle, Link as LinkIcon, FileText, Image as ImageIcon, Trophy, Users, TrendingDown, RotateCcw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// Fullscreen loading overlay with blur
function FullscreenLoader({ message }: { message: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface/90 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-white font-bold text-lg">{message}</p>
                <p className="text-gray-500 text-xs">Aguarde...</p>
            </div>
        </div>
    );
}

export default function EditBetPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'POLÍTICA',
        end_date: '',
        image_url: '',
        yes_image_url: '',
        no_image_url: '',
        status: '',
        total_pool: 0,
        resolution_result: null as string | null,
        outcomes: [] as string[],
        metadata: {} as any
    });

    // Proof of Result
    const [proofText, setProofText] = useState('');
    const [proofLink, setProofLink] = useState('');
    const [proofImage, setProofImage] = useState('');

    // Pool Summary (for resolved markets)
    const [betsData, setBetsData] = useState<any[]>([]);
    const [loadingBets, setLoadingBets] = useState(false);

    useEffect(() => {
        if (id) fetchMarket();
    }, [id]);

    const fetchMarket = async () => {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching market:", error);
            alert("Erro ao carregar mercado.");
            router.push('/app/admin/bets');
            return;
        }

        if (data) {
            const meta = data.metadata || {};
            setFormData({
                title: data.title,
                description: data.description || '',
                category: data.category,
                end_date: new Date(data.end_date).toISOString().slice(0, 16),
                image_url: data.image_url || '',
                yes_image_url: meta.yes_image || '',
                no_image_url: meta.no_image || '',
                status: data.status,
                total_pool: data.total_pool || 0,
                resolution_result: data.resolution_result,
                outcomes: data.outcomes || ['YES', 'NO'],
                metadata: meta
            });

            // Load proof data from metadata
            const proof = meta.resolution_proof || {};
            setProofText(proof.text || '');
            setProofLink(proof.link || '');
            setProofImage(proof.image || '');

            // If resolved, fetch bets summary
            if (data.status === 'RESOLVED' || data.status === 'CANCELED') {
                fetchBetsSummary();
            }
        }
        setLoading(false);
    };

    const fetchBetsSummary = async () => {
        setLoadingBets(true);
        const { data, error } = await supabase
            .from('bets')
            .select('*, users(full_name, email)')
            .eq('market_id', id)
            .order('created_at', { ascending: false });

        if (data) setBetsData(data);
        setLoadingBets(false);
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: any, field: string) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            if (field === 'proofImage') {
                setProofImage(objectUrl);
            } else {
                setFormData(prev => ({ ...prev, [field]: objectUrl }));
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${new Date().getTime()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const uploadPromise = supabase.storage.from('images').upload(filePath, file);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout (45s).')), 45000)
            );

            const result: any = await Promise.race([uploadPromise, timeoutPromise]);
            if (result.error) throw result.error;

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            if (field === 'proofImage') {
                setProofImage(data.publicUrl);
            } else {
                setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
            }

        } catch (error: any) {
            alert("Erro no upload: " + error.message);
            if (field === 'proofImage') {
                setProofImage('');
            } else {
                setFormData(prev => ({ ...prev, [field]: '' }));
            }
        }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (formData.image_url.startsWith('blob:') ||
                formData.yes_image_url.startsWith('blob:') ||
                formData.no_image_url.startsWith('blob:') ||
                proofImage.startsWith('blob:')) {
                alert("Aguarde o upload das imagens terminar antes de salvar.");
                setSaving(false);
                return;
            }

            const updatedMetadata = {
                ...formData.metadata,
                yes_image: formData.yes_image_url,
                no_image: formData.no_image_url,
                resolution_proof: {
                    text: proofText || undefined,
                    link: proofLink || undefined,
                    image: proofImage || undefined
                }
            };

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de conexão excedido (10s).')), 10000)
            );

            const updatePromise = supabase
                .from('markets')
                .update({
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    end_date: new Date(formData.end_date).toISOString(),
                    image_url: formData.image_url,
                    metadata: updatedMetadata
                })
                .eq('id', id);

            const { error }: any = await Promise.race([updatePromise, timeoutPromise]);

            if (error) throw error;

            alert("Mercado atualizado com sucesso!");

        } catch (error: any) {
            console.error("Save Error:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResolve = async (outcome: string) => {
        if (!confirm(`Tem certeza que o resultado foi "${outcome}"? \nIsso encerrará o mercado e distribuirá os ganhos imediatamente.`)) return;

        setActionLoading('Resolvendo mercado...');
        try {
            const { error } = await supabase.rpc('resolve_market', {
                p_market_id: id,
                p_outcome: outcome
            });

            if (error) throw error;

            setActionLoading(null);
            alert("Mercado resolvido e pagamentos distribuídos!");
            if (confirm("Deseja duplicar este mercado e criar um novo com os mesmos dados preenchidos?")) {
                router.push(`/app/admin/bets/new?duplicate=${id}`);
            } else {
                router.push('/app/admin/bets');
            }
        } catch (error: any) {
            console.error("Resolution Error:", error);
            setActionLoading(null);
            alert("Erro ao resolver: " + error.message + "\n(Verifique se a função SQL 'resolve_market' existe)");
        }
    };

    const handleVoid = async () => {
        if (!confirm("ATENÇÃO: Tem certeza que deseja ANULAR este mercado?\n\nIsso irá:\n1. Cancelar o mercado.\n2. Estornar 100% do valor aportado para as contas dos usuários.\n\nEssa ação não pode ser desfeita.")) return;

        setActionLoading('Anulando mercado...');
        try {
            const { error } = await supabase.rpc('void_market', {
                p_market_id: id
            });

            if (error) throw error;

            setActionLoading(null);
            alert("Mercado anulado e valores estornados com sucesso!");
            router.push('/app/admin/bets');
        } catch (error: any) {
            console.error("Void Error:", error);
            setActionLoading(null);
            alert("Erro ao anular: " + error.message);
        }
    };

    const handleReopen = async () => {
        // Safety: only reopen if no bets exist
        const { count } = await supabase
            .from('bets')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', id);

        if ((count || 0) > 0) {
            alert(`Este mercado tem ${count} previsões. Não é possível reabrir um mercado com participantes.`);
            return;
        }

        if (!confirm('Reabrir este mercado? Ele voltará ao status OPEN.')) return;

        setActionLoading('Reabrindo mercado...');
        try {
            const { error } = await supabase
                .from('markets')
                .update({
                    status: 'OPEN',
                    resolution_result: null
                })
                .eq('id', id);

            if (error) throw error;

            setActionLoading(null);
            setFormData(prev => ({ ...prev, status: 'OPEN', resolution_result: null }));
            alert('Mercado reaberto com sucesso!');
        } catch (error: any) {
            setActionLoading(null);
            alert('Erro ao reabrir: ' + error.message);
        }
    };

    // Pool Summary Calculations
    const winners = betsData.filter(b => b.side === formData.resolution_result || b.outcome === formData.resolution_result);
    const losers = betsData.filter(b => b.side !== formData.resolution_result && b.outcome !== formData.resolution_result);
    const totalWinAmount = winners.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalLoseAmount = losers.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalPayout = winners.reduce((acc, b) => acc + (b.payout || 0), 0);

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;

    const isProcessing = !!actionLoading || saving;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {actionLoading && <FullscreenLoader message={actionLoading} />}
            <div className="flex items-center gap-4">
                <Link href="/app/admin/bets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Editar Mercado <span className="text-sm font-normal text-gray-500 ml-2">#{id.substring(0, 8)}</span></h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Column: Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-surface/30 border border-white/5 rounded-xl p-8 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Detalhes</h3>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">Título</label>
                                <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">Detalhes / Descrição</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Regras, fontes de resolução, detalhes adicionais..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400">Categoria</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
                                        <option value="POLÍTICA">Política</option>
                                        <option value="ESPORTE">Esporte</option>
                                        <option value="ECONOMIA">Economia</option>
                                        <option value="CRIPTO">Cripto</option>
                                        <option value="REALITY">Reality Show</option>
                                        <option value="CLIMA">Clima</option>
                                        <option value="ENTRETENIMENTO">Entretenimento</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400">Encerramento</label>
                                    <input type="datetime-local" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">URL da Imagem Capa</label>
                                <div className="flex gap-2">
                                    <input name="image_url" value={formData.image_url} onChange={handleChange} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
                                    <div className="relative overflow-hidden w-10">
                                        <input type="file" onChange={(e) => handleImageUpload(e, 'image_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <button type="button" className="w-full h-full bg-surface border border-white/10 rounded flex items-center justify-center hover:bg-white/10"><Upload className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400">Img SIM</label>
                                    <div className="flex gap-2">
                                        <input name="yes_image_url" value={formData.yes_image_url} onChange={handleChange} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
                                        <div className="relative overflow-hidden w-10">
                                            <input type="file" onChange={(e) => handleImageUpload(e, 'yes_image_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <button type="button" className="w-full h-full bg-surface border border-white/10 rounded flex items-center justify-center hover:bg-white/10"><Upload className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400">Img NÃO</label>
                                    <div className="flex gap-2">
                                        <input name="no_image_url" value={formData.no_image_url} onChange={handleChange} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
                                        <div className="relative overflow-hidden w-10">
                                            <input type="file" onChange={(e) => handleImageUpload(e, 'no_image_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <button type="button" className="w-full h-full bg-surface border border-white/10 rounded flex items-center justify-center hover:bg-white/10"><Upload className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ── Proof of Result Section ── */}
                        <div className="space-y-4 border-t border-white/5 pt-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Prova do Resultado
                            </h3>
                            <p className="text-xs text-gray-500">Adicione evidências da resolução para transparência. Os participantes poderão ver isso na página do mercado.</p>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Descrição / Justificativa
                                </label>
                                <textarea
                                    value={proofText}
                                    onChange={(e) => setProofText(e.target.value)}
                                    rows={3}
                                    placeholder="Ex: Resultado confirmado pelo site oficial da CBF em 23/02/2026..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary resize-none text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" /> Link da Fonte
                                </label>
                                <input
                                    type="url"
                                    value={proofLink}
                                    onChange={(e) => setProofLink(e.target.value)}
                                    placeholder="https://g1.globo.com/..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Print / Imagem Prova
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={proofImage}
                                        onChange={(e) => setProofImage(e.target.value)}
                                        placeholder="URL ou faça upload..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
                                    />
                                    <div className="relative overflow-hidden w-10">
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'proofImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <button type="button" className="w-full h-full bg-surface border border-white/10 rounded flex items-center justify-center hover:bg-white/10"><Upload className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {proofImage && !proofImage.startsWith('blob:') && (
                                    <div className="mt-2 relative inline-block">
                                        <img src={proofImage} alt="Prova" className="max-h-40 rounded-lg border border-white/10" />
                                        <button type="button" onClick={() => setProofImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                                {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Resolution Actions + Pool Summary */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-surface/30 border border-white/5 rounded-xl p-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Status & Resolução</h3>

                        <div className="mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Status Atual:</span>
                                <span className={`font-bold ${formData.status === 'OPEN' ? 'text-green-400' : formData.status === 'RESOLVED' ? 'text-blue-400' : 'text-red-400'}`}>
                                    {formData.status}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Pool Total:</span>
                                <span className="font-mono text-white">R$ {formData.total_pool.toFixed(2)}</span>
                            </div>
                            {formData.resolution_result && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Resultado:</span>
                                    <span className="font-bold text-primary">{formData.resolution_result}</span>
                                </div>
                            )}
                        </div>

                        {formData.status === 'OPEN' ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 text-xs text-yellow-200 mb-4">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>Atenção: A resolução é irreversível. Certifique-se do resultado oficial antes de confirmar.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {formData.outcomes.map((outcome, idx) => (
                                        <button
                                            key={outcome}
                                            onClick={() => handleResolve(outcome)}
                                            disabled={resolving}
                                            className={`py-3 border rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${idx === 0 ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400' :
                                                idx === 1 ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400' :
                                                    'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400'
                                                }`}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {outcome}
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <button
                                        onClick={handleVoid}
                                        disabled={resolving}
                                        className="w-full py-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-gray-400 hover:text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Anular Mercado (Estorno Total)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                                    {formData.status === 'CANCELED' ? (
                                        <>
                                            <Ban className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                            <p className="text-white font-bold">Mercado Anulado</p>
                                            <p className="text-sm text-gray-500">Valores estornados.</p>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                            <p className="text-white font-bold">Mercado Resolvido</p>
                                            <p className="text-sm text-gray-500">Resultado: {formData.resolution_result}</p>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={handleReopen}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reabrir Mercado
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Pool Summary Card (Resolved Only) ── */}
                    {(formData.status === 'RESOLVED' || formData.status === 'CANCELED') && (
                        <div className="bg-surface/30 border border-white/5 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-400" /> Resumo do Pool
                            </h3>

                            {loadingBets ? (
                                <p className="text-gray-500 text-sm text-center py-4">Carregando...</p>
                            ) : betsData.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhuma participação registrada.</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                                            <p className="text-xs text-gray-500">Total Apostado</p>
                                            <p className="text-lg font-bold text-white font-mono">R$ {formData.total_pool.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                                            <p className="text-xs text-gray-500">Participantes</p>
                                            <p className="text-lg font-bold text-white">{betsData.length}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-green-500/5 p-3 rounded-lg border border-green-500/20 text-center">
                                            <p className="text-xs text-green-400 flex items-center justify-center gap-1"><Trophy className="w-3 h-3" /> Ganhadores</p>
                                            <p className="text-xl font-bold text-green-400">{winners.length}</p>
                                            <p className="text-xs text-gray-500 font-mono">R$ {totalWinAmount.toFixed(2)} aportado</p>
                                        </div>
                                        <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/20 text-center">
                                            <p className="text-xs text-red-400 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> Perdedores</p>
                                            <p className="text-xl font-bold text-red-400">{losers.length}</p>
                                            <p className="text-xs text-gray-500 font-mono">R$ {totalLoseAmount.toFixed(2)} aportado</p>
                                        </div>
                                    </div>

                                    {/* Winners List */}
                                    {winners.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1"><Trophy className="w-3 h-3" /> Ganhadores</h4>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {winners.map(b => (
                                                    <div key={b.id} className="flex justify-between items-center text-xs py-1.5 px-2 bg-green-500/5 rounded border border-green-500/10">
                                                        <span className="text-gray-300 truncate max-w-[120px]">{b.users?.full_name || 'Anônimo'}</span>
                                                        <div className="text-right">
                                                            <span className="text-gray-500">R$ {b.amount?.toFixed(2)}</span>
                                                            <span className="text-green-400 ml-2 font-bold">→ R$ {(b.payout || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Losers List */}
                                    {losers.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Perdedores</h4>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {losers.map(b => (
                                                    <div key={b.id} className="flex justify-between items-center text-xs py-1.5 px-2 bg-red-500/5 rounded border border-red-500/10">
                                                        <span className="text-gray-300 truncate max-w-[120px]">{b.users?.full_name || 'Anônimo'}</span>
                                                        <span className="text-red-400 font-mono">- R$ {b.amount?.toFixed(2)}</span>
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
            </div>
        </div>
    );
}
