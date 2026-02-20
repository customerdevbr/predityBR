"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Upload, Trash2, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function EditBetPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resolving, setResolving] = useState(false);

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
        resolution_result: null
    });

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
            alert("Erro ao carregar aposta.");
            router.push('/app/admin/bets');
            return;
        }

        if (data) {
            setFormData({
                title: data.title,
                description: data.description || '',
                category: data.category,
                end_date: new Date(data.end_date).toISOString().slice(0, 16), // Format for datetime-local
                image_url: data.image_url || '',
                yes_image_url: data.metadata?.yes_image || '',
                no_image_url: data.metadata?.no_image || '',
                status: data.status,
                total_pool: data.total_pool || 0,
                resolution_result: data.resolution_result
            });
        }
        setLoading(false);
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: any, field: string) => {
        // ... (Reuse logic from new/page.tsx)
        // Simplification for brevity: Reuse the same logic or extract to hook. 
        // Reproducing strict logic here:
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, [field]: objectUrl }));

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
            setFormData(prev => ({ ...prev, [field]: data.publicUrl }));

        } catch (error: any) {
            alert("Erro no upload: " + error.message);
            setFormData(prev => ({ ...prev, [field]: '' })); // Clear on error
        }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        console.log("Saving market...", formData);

        try {
            // Check for blobs
            if (formData.image_url.startsWith('blob:') ||
                formData.yes_image_url.startsWith('blob:') ||
                formData.no_image_url.startsWith('blob:')) {
                alert("Aguarde o upload das imagens terminar antes de salvar.");
                setSaving(false);
                return;
            }

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de conexão excedido (10s). Verifique sua internet ou permissões.')), 10000)
            );

            // Execute update with race condition
            const updatePromise = supabase
                .from('markets')
                .update({
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    end_date: new Date(formData.end_date).toISOString(),
                    image_url: formData.image_url,
                    metadata: {
                        yes_image: formData.yes_image_url,
                        no_image: formData.no_image_url
                    }
                })
                .eq('id', id);

            const { error }: any = await Promise.race([updatePromise, timeoutPromise]);

            if (error) throw error;

            alert("Aposta atualizada com sucesso!");

        } catch (error: any) {
            console.error("Save Error:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResolve = async (outcome: 'YES' | 'NO') => {
        if (!confirm(`Tem certeza que o resultado foi "${outcome === 'YES' ? 'SIM' : 'NÃO'}"? \nIsso encerrará a aposta e distribuirá os ganhos imediatamente.`)) return;

        setResolving(true);
        try {
            // Call PostgreSQL RPC function
            const { error } = await supabase.rpc('resolve_market', {
                p_market_id: id,
                p_outcome: outcome
            });

            if (error) throw error;

            alert("Aposta resolvida e pagamentos distribuídos!");
            router.push('/app/admin/bets');
        } catch (error: any) {
            console.error("Resolution Error:", error);
            alert("Erro ao resolver: " + error.message + "\n(Verifique se a função SQL 'resolve_market' existe)");
        } finally {
            setResolving(false);
        }
    };

    const handleVoid = async () => {
        if (!confirm("ATENÇÃO: Tem certeza que deseja ANULAR esta aposta?\n\nIsso irá:\n1. Cancelar o mercado.\n2. Estornar 100% do valor apostado para as contas dos usuários.\n\nEssa ação não pode ser desfeita.")) return;

        setResolving(true);
        try {
            const { error } = await supabase.rpc('void_market', {
                p_market_id: id
            });

            if (error) throw error;

            alert("Aposta anulada e valores estornados com sucesso!");
            router.push('/app/admin/bets');
        } catch (error: any) {
            console.error("Void Error:", error);
            alert("Erro ao anular: " + error.message);
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/app/admin/bets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Editar Aposta <span className="text-sm font-normal text-gray-500 ml-2">#{id.substring(0, 8)}</span></h1>
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

                            {/* Simplified Image Change Logic: Just URL input for now to save space, assuming upload hook works if enabled fully but sticking to text for speed unless user insists on file input here too. 
                               Actually, let's copy the file input logic but keep it compact.
                            */}
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

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={saving || formData.status === 'RESOLVED'} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                                {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Resolution Actions */}
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
                        </div>

                        {formData.status === 'OPEN' ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 text-xs text-yellow-200 mb-4">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>Atenção: A resolução é irreversível. Certifique-se do resultado oficial antes de confirmar.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleResolve('YES')}
                                        disabled={resolving}
                                        className="py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Sim
                                    </button>

                                    <button
                                        onClick={() => handleResolve('NO')}
                                        disabled={resolving}
                                        className="py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Não
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <button
                                        onClick={handleVoid}
                                        disabled={resolving}
                                        className="w-full py-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-gray-400 hover:text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Anular Aposta (Estorno Total)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                                {formData.status === 'CANCELED' ? (
                                    <>
                                        <Ban className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                        <p className="text-white font-bold">Aposta Anulada</p>
                                        <p className="text-sm text-gray-500">Valores estornados.</p>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                        <p className="text-white font-bold">Aposta Resolvida</p>
                                        <p className="text-sm text-gray-500">Resultado: {formData.resolution_result === 'YES' ? 'SIM' : 'NÃO'}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper icon import fix
import { XCircle } from 'lucide-react'; 
