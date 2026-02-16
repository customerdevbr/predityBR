"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';

export default function NewBetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        category: string;
        end_date: string;
        image_url: string;
        yes_image_url: string;
        no_image_url: string;
        initial_pool: number;
        outcomes: string[];
        outcome_images: string[];
    }>({
        title: '',
        description: '',
        category: 'POLÍTICA',
        end_date: '',
        image_url: '',
        yes_image_url: '',
        no_image_url: '',
        initial_pool: 0,
        outcomes: ['SIM', 'NÃO'],
        outcome_images: ['', ''] // Parallel array
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.title || !formData.end_date) {
                alert("Preencha os campos obrigatórios.");
                setLoading(false);
                return;
            }

            // Validate Images (Check for blob URLs which indicate failed/pending uploads)
            if (formData.image_url.startsWith('blob:') ||
                formData.yes_image_url.startsWith('blob:') ||
                formData.no_image_url.startsWith('blob:')) {
                alert("Algumas imagens não foram enviadas corretamentes (ainda estão como prévia 'blob:').\n\nPor favor, aguarde o upload terminar ou tente enviar novamente.");
                setLoading(false);
                return;
            }

            // Get Current User
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Usuário não autenticado.");
            }

            // Create Timeout Promise (10s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de conexão excedido (10s). Verifique sua internet ou permissões.')), 10000)
            );

            // Create Insert Promise
            const outcomes = formData.outcomes.filter(o => o.trim() !== ''); // Filter empty
            if (outcomes.length < 2) {
                alert("É necessário pelo menos 2 opções de aposta.");
                setLoading(false);
                return;
            }

            // Init pools
            const outcomePools = outcomes.reduce((acc: any, curr: string) => {
                acc[curr] = 0;
                return acc;
            }, {});

            const insertPromise = supabase.from('markets').insert({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                end_date: new Date(formData.end_date).toISOString(),
                image_url: formData.image_url,
                outcomes: outcomes, // JSONB array
                outcome_pools: outcomePools, // JSONB object
                metadata: {
                    yes_image: formData.yes_image_url || '',
                    no_image: formData.no_image_url || ''
                    // Future: outcome_images map
                },
                status: 'OPEN',
                total_pool: 0,
                // Deprecated but keep for now just in case
                total_yes_amount: 0,
                total_no_amount: 0,
                created_by: user.id
            });

            // Race Condition
            const { error }: any = await Promise.race([insertPromise, timeoutPromise]);

            if (error) throw error;

            alert("Aposta criada com sucesso!");
            router.push('/app/admin/bets');

        } catch (error: any) {
            console.error("Error creating bet:", error);
            alert("Erro ao criar aposta: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: any, field: string) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            // Immediate Preview (Local) but track it's loading
            const objectUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, [field]: objectUrl }));

            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${new Date().getTime()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload with Timeout Race (Increased to 45s)
            const uploadPromise = supabase.storage
                .from('images')
                .upload(filePath, file);

            // 45 seconds timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite de upload excedido (45s). Verifique sua conexão ou se o bucket existe.')), 45000)
            );

            const result: any = await Promise.race([uploadPromise, timeoutPromise]);

            if (result.error) {
                console.error("Upload error details:", result.error);
                throw new Error("Falha no upload (Supabase): " + result.error.message);
            }

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);

            // Update with Real URL
            setFormData(prev => ({ ...prev, [field]: data.publicUrl }));

        } catch (error: any) {
            console.error(error);
            alert("Erro no upload: " + error.message + "\n\nA prévia foi removida. Tente novamente.");
            // Revert the failed field to empty to prevent saving bad data
            setFormData(prev => ({ ...prev, [field]: '' }));
        } finally {
            setUploading(false);
        }
    };

    const handleOutcomeImageUpload = async (e: any, index: number) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            // Preview
            const objectUrl = URL.createObjectURL(file);
            const newImages = [...(formData.outcome_images || [])];
            // Ensure array is big enough
            while (newImages.length <= index) newImages.push('');
            newImages[index] = objectUrl;
            setFormData(prev => ({ ...prev, outcome_images: newImages }));

            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `outcome_${new Date().getTime()}_${index}.${fileExt}`;

            const { data, error } = await supabase.storage.from('images').upload(fileName, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

            // Update with Real URL
            const finalImages = [...(formData.outcome_images || [])];
            while (finalImages.length <= index) finalImages.push('');
            finalImages[index] = publicUrl;
            setFormData(prev => ({ ...prev, outcome_images: finalImages }));

        } catch (error: any) {
            alert("Erro upload: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/app/admin/bets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Nova Aposta</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface/30 border border-white/5 rounded-xl p-8 space-y-8">

                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Informações Básicas</h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400">Pergunta (Título)</label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                type="text"
                                placeholder="Ex: O dólar vai cair amanhã?"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400">Categoria</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none"
                            >
                                <option value="POLÍTICA">Política</option>
                                <option value="ESPORTE">Esporte</option>
                                <option value="ECONOMIA">Economia</option>
                                <option value="CRIPTO">Cripto</option>
                                <option value="REALITY">Reality Show</option>
                                <option value="CLIMA">Clima</option>
                                <option value="ENTRETENIMENTO">Entretenimento</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400">Descrição (Detalhes)</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Regras específicas para resolução..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400">Data de Encerramento (Fim das Apostas)</label>
                            <input
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>

                    {/* Dynamic Outcomes */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Opções de Aposta</h3>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, outcomes: [...prev.outcomes, ''] }))}
                                className="text-xs bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30 transition-colors"
                            >
                                + Adicionar Opção
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {formData.outcomes.map((outcome, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        value={outcome}
                                        onChange={(e) => {
                                            const newOutcomes = [...formData.outcomes];
                                            newOutcomes[index] = e.target.value;
                                            setFormData(prev => ({ ...prev, outcomes: newOutcomes }));
                                        }}
                                        type="text"
                                        placeholder={`Opção ${index + 1}`}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                    />
                                    {formData.outcomes.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, outcomes: prev.outcomes.filter((_, i) => i !== index) }))}
                                            className="px-3 text-red-500 hover:bg-white/5 rounded"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">* Mínimo de 2 opções obrigatórias.</p>
                    </div>
                </div>

                {/* Images */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Imagens</h3>

                    {/* Cover Image */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                            Imagem de Capa <span className="text-xs font-normal text-gray-600">(Upload ou URL)</span>
                        </label>
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <input
                                    type="file"
                                    onChange={(e) => handleImageUpload(e, 'image_url')}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept="image/*"
                                />
                                <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-gray-400 flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                                    <Upload className="w-5 h-5" />
                                    <span>{uploading ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                                </div>
                            </div>
                            <input
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                type="url"
                                placeholder="Ou cole a URL..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        {formData.image_url && (
                            <div className="mt-2 w-full h-40 rounded md:w-64 overflow-hidden border border-white/20 bg-black">
                                <img src={formData.image_url} className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Yes Image */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                Avatar "SIM"
                            </label>
                            <div className="flex flex-col gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={(e) => handleImageUpload(e, 'yes_image_url')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*"
                                    />
                                    <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                                        <Upload className="w-4 h-4" /> Importar
                                    </div>
                                </div>
                                <input
                                    name="yes_image_url"
                                    value={formData.yes_image_url}
                                    onChange={handleChange}
                                    type="url"
                                    placeholder="URL..."
                                    className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                />
                                {formData.yes_image_url && (
                                    <img src={formData.yes_image_url} className="w-10 h-10 rounded-full object-cover border border-white/20 bg-black" />
                                )}
                            </div>
                        </div>

                        {/* No Image */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                Avatar "NÃO"
                            </label>
                            <div className="flex flex-col gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={(e) => handleImageUpload(e, 'no_image_url')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*"
                                    />
                                    <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                                        <Upload className="w-4 h-4" /> Importar
                                    </div>
                                </div>
                                <input
                                    name="no_image_url"
                                    value={formData.no_image_url}
                                    onChange={handleChange}
                                    type="url"
                                    placeholder="URL..."
                                    className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                />
                                {formData.no_image_url && (
                                    <img src={formData.no_image_url} className="w-10 h-10 rounded-full object-cover border border-white/20 bg-black" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-4">
                    <Link href="/app/admin/bets" className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : uploading ? 'Enviando Imagem...' : <><Save className="w-5 h-5" /> Criar Aposta</>}
                    </button>
                </div>

            </form>
        </div>
    );
}
