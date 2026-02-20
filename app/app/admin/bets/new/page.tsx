"use client";

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const OPTION_DEFAULTS = ['SIM', 'NÃO', '', '', '', '', '', '', '', ''];
const MAX_OPTIONS = 10;

interface OptionData {
    name: string;
    image: string; // public URL or blob preview
}

function ImageField({
    value,
    onChange,
    onUpload,
    uploading,
    label,
}: {
    value: string;
    onChange: (v: string) => void;
    onUpload: (file: File) => Promise<void>;
    uploading: boolean;
    label: string;
}) {
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await onUpload(file);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium">{label}</label>
            <div className="flex gap-2">
                {/* Upload button */}
                <div className="relative">
                    <input ref={fileRef} type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFile} />
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${uploading ? 'border-primary/40 text-primary' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Enviando...' : 'Upload'}
                    </div>
                </div>

                {/* URL input */}
                <input
                    type="url"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="ou cole a URL..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-w-0"
                />

                {/* Preview thumbnail */}
                {value && !value.startsWith('blob:') && (
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-black">
                        <img src={value} alt="preview" className="w-full h-full object-cover" />
                    </div>
                )}
                {value && (
                    <button type="button" onClick={() => onChange('')} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function NewBetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<number | null>(null); // which option index is uploading

    // Title/meta fields
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('POLÍTICA');
    const [endDate, setEndDate] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);

    // Options: always 10 slots, A+B are required (index 0,1), C-J optional
    const [options, setOptions] = useState<OptionData[]>(
        OPTION_DEFAULTS.map((name, i) => ({ name, image: '' }))
    );

    // How many options are "active" (user has filled the previous one)
    // A and B are always active. C activates when B is filled, D when C is filled, etc.
    const activeCount = (() => {
        let count = 2; // A and B always
        for (let i = 2; i < MAX_OPTIONS; i++) {
            if (options[i - 1].name.trim() !== '') count = i + 1;
            else break;
        }
        return Math.min(count, MAX_OPTIONS);
    })();

    const setOptionName = (index: number, name: string) => {
        setOptions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], name };
            // If clearing a middle option, clear all subsequent ones too
            if (!name.trim()) {
                for (let i = index + 1; i < MAX_OPTIONS; i++) {
                    next[i] = { name: '', image: '' };
                }
            }
            return next;
        });
    };

    const setOptionImage = (index: number, image: string) => {
        setOptions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], image };
            return next;
        });
    };

    const uploadImage = async (file: File, bucket = 'images'): Promise<string> => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleOptionImageUpload = async (index: number, file: File) => {
        setUploading(index);
        try {
            // Show blob preview immediately
            const blob = URL.createObjectURL(file);
            setOptionImage(index, blob);
            const url = await uploadImage(file);
            setOptionImage(index, url);
        } catch (e: any) {
            alert('Erro upload: ' + e.message);
            setOptionImage(index, '');
        } finally {
            setUploading(null);
        }
    };

    const handleCoverUpload = async (file: File) => {
        setUploadingCover(true);
        try {
            const blob = URL.createObjectURL(file);
            setCoverUrl(blob);
            const url = await uploadImage(file);
            setCoverUrl(url);
        } catch (e: any) {
            alert('Erro upload: ' + e.message);
            setCoverUrl('');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !endDate) { alert('Preencha os campos obrigatórios.'); return; }

        const validOptions = options.slice(0, activeCount).filter(o => o.name.trim() !== '');
        if (validOptions.length < 2) { alert('É necessário pelo menos 2 opções.'); return; }

        // Make sure no blob URLs remain
        if (coverUrl.startsWith('blob:') || validOptions.some(o => o.image.startsWith('blob:'))) {
            alert('Aguarde o upload de todas as imagens terminar antes de salvar.'); return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const outcomeNames = validOptions.map(o => o.name.trim());
            const outcomePools = outcomeNames.reduce((acc: any, k) => { acc[k] = 0; return acc; }, {});

            // Build outcome_images map: { "SIM": "url", "NÃO": "url", ... }
            const outcomeImages = outcomeNames.reduce((acc: any, name, i) => {
                if (validOptions[i].image) acc[name] = validOptions[i].image;
                return acc;
            }, {});

            const { error } = await supabase.from('markets').insert({
                title,
                description,
                category,
                end_date: new Date(endDate).toISOString(),
                image_url: coverUrl,
                outcomes: outcomeNames,
                outcome_pools: outcomePools,
                metadata: {
                    yes_image: validOptions[0]?.image || '',
                    no_image: validOptions[1]?.image || '',
                    outcome_images: outcomeImages,
                },
                status: 'OPEN',
                total_pool: 0,
                total_yes_amount: 0,
                total_no_amount: 0,
                created_by: user.id,
                slug: slug || undefined,
            });

            if (error) throw error;
            alert('Aposta criada com sucesso!');
            router.push('/app/admin/bets');
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-sm";

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
            <div className="flex items-center gap-4">
                <Link href="/app/admin/bets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Nova Previsão</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* ── BASIC INFO ── */}
                <div className="bg-surface/20 border border-white/5 rounded-xl p-6 space-y-5">
                    <h3 className="font-bold text-white border-b border-white/5 pb-3">Informações Básicas</h3>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pergunta (Título) *</label>
                            <input
                                value={title}
                                onChange={e => {
                                    setTitle(e.target.value);
                                    setSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                                }}
                                type="text" placeholder="Ex: O dólar vai cair amanhã?" className={inputCls} required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Slug (URL)</label>
                            <input value={slug} onChange={e => setSlug(e.target.value)} type="text" placeholder="ex: lula-sera-eleito" className={inputCls} />
                            <p className="text-xs text-gray-600">/app/markets/{slug || '...'}</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls + ' appearance-none'}>
                                {['POLÍTICA', 'ESPORTE', 'ECONOMIA', 'CRIPTO', 'REALITY', 'CLIMA', 'ENTRETENIMENTO'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de Encerramento *</label>
                            <input value={endDate} onChange={e => setEndDate(e.target.value)} type="datetime-local" className={inputCls + ' [color-scheme:dark]'} required />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição / Regras</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descreva as regras de resolução..." className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* ── COVER IMAGE ── */}
                <div className="bg-surface/20 border border-white/5 rounded-xl p-6 space-y-4">
                    <h3 className="font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-400" /> Imagem de Capa
                    </h3>
                    <div className="flex gap-3 items-center">
                        <div className="relative">
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors cursor-pointer">
                                <Upload className="w-4 h-4" /> {uploadingCover ? 'Enviando...' : 'Upload'}
                            </div>
                        </div>
                        <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} type="url" placeholder="ou cole a URL da imagem..." className={inputCls} />
                    </div>
                    {coverUrl && !coverUrl.startsWith('blob:') && (
                        <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 bg-black">
                            <img src={coverUrl} alt="capa" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                {/* ── OPTIONS ── */}
                <div className="bg-surface/20 border border-white/5 rounded-xl p-6 space-y-4">
                    <div>
                        <h3 className="font-bold text-white">Opções de Resposta</h3>
                        <p className="text-xs text-gray-500 mt-1">A e B são obrigatórias. Preencher uma opção habilita a próxima, até 10.</p>
                    </div>

                    <div className="space-y-3">
                        {Array.from({ length: activeCount }).map((_, i) => {
                            const isRequired = i < 2;
                            const label = OPTION_LABELS[i];
                            const opt = options[i];

                            return (
                                <div
                                    key={i}
                                    className={`border rounded-xl p-4 space-y-3 transition-colors ${isRequired ? 'border-white/10 bg-black/20' : 'border-white/5 bg-black/10'}`}
                                >
                                    {/* Header row */}
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isRequired ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                                            {label}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                value={opt.name}
                                                onChange={e => setOptionName(i, e.target.value)}
                                                type="text"
                                                placeholder={i === 0 ? 'SIM (nome sugestivo)' : i === 1 ? 'NÃO (nome sugestivo)' : `Nome da opção ${label}...`}
                                                required={isRequired}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors"
                                            />
                                        </div>
                                        {!isRequired && (
                                            <span className="text-[10px] text-gray-600 font-bold uppercase flex-shrink-0">Opcional</span>
                                        )}
                                    </div>

                                    {/* Image row */}
                                    <ImageField
                                        value={opt.image}
                                        onChange={v => setOptionImage(i, v)}
                                        onUpload={file => handleOptionImageUpload(i, file)}
                                        uploading={uploading === i}
                                        label={`Imagem para "${opt.name || label}"`}
                                    />
                                </div>
                            );
                        })}

                        {activeCount < MAX_OPTIONS && options[activeCount - 1].name.trim() !== '' && (
                            <div className="border border-dashed border-white/5 rounded-xl py-4 text-center text-xs text-gray-600">
                                Preencha a opção {OPTION_LABELS[activeCount - 1]} para habilitar a próxima
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ACTIONS ── */}
                <div className="flex items-center justify-end gap-4 pt-2">
                    <Link href="/app/admin/bets" className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading || uploadingCover || uploading !== null}
                        className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : uploading !== null ? 'Enviando imagem...' : <><Save className="w-5 h-5" /> Criar Previsão</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
