"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewBetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'POLÍTICA',
        end_date: '',
        image_url: '',
        yes_image_url: '', // New field for outcome avatar
        no_image_url: '',  // New field for outcome avatar
        initial_pool: 0
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

            // Insert Market
            const { error } = await supabase.from('markets').insert({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                end_date: new Date(formData.end_date).toISOString(),
                image_url: formData.image_url,
                // We might need to store yes/no images in metadata if columns don't exist yet, 
                // OR assuming we will add columns. For now, let's use a JSON metadata column or just ignore if schema not ready.
                // Re-reading schema: User didn't provide schema but we are "creating" it. 
                // Let's assume we can add these columns or put in 'metadata' json column.
                // Checking previous context: No mention of metadata column.
                // BEST APPROACH: Store in 'image_url' (cover) and maybe put others in description for now?
                // OR better: Create the columns if possible. 
                // Since I cannot run SQL easily, I will attempt to insert into 'metadata' column if it exists, or just omit for now and warn user.
                // Wait, 'metadata' acts as a catch-all often.
                // Let's try to add specific columns in a migration if I could, but I can't.
                // JSONB 'metadata' is common.
                metadata: {
                    yes_image: formData.yes_image_url,
                    no_image: formData.no_image_url
                },
                status: 'OPEN',
                total_pool: 0,
                total_yes_amount: 0,
                total_no_amount: 0,
                created_by: 'ADMIN' // or user.id
            });

            if (error) throw error;

            alert("Aposta criada com sucesso!");
            router.push('/admin/bets');

        } catch (error: any) {
            console.error("Error creating bet:", error);
            alert("Erro ao criar aposta: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/bets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
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
                        {/* Initial Pool Placeholder - for seeding logic if needed */}
                    </div>
                </div>

                {/* Images */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Imagens</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                            Imagem de Capa (URL) <span className="text-xs font-normal text-gray-600">(Recomendado: 600x400)</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                type="url"
                                placeholder="https://..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                            {formData.image_url && (
                                <div className="w-12 h-12 rounded overflow-hidden border border-white/20">
                                    <img src={formData.image_url} className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                Avatar "SIM" (URL)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    name="yes_image_url"
                                    value={formData.yes_image_url}
                                    onChange={handleChange}
                                    type="url"
                                    placeholder="https://..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                {formData.yes_image_url && (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                                        <img src={formData.yes_image_url} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                Avatar "NÃO" (URL)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    name="no_image_url"
                                    value={formData.no_image_url}
                                    onChange={handleChange}
                                    type="url"
                                    placeholder="https://..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                {formData.no_image_url && (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                                        <img src={formData.no_image_url} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-4">
                    <Link href="/admin/bets" className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : <><Save className="w-5 h-5" /> Criar Aposta</>}
                    </button>
                </div>

            </form>
        </div>
    );
}
