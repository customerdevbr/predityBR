"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

const FloatingEmoji = ({ emoji, delay }: { emoji: string; delay: number }) => (
    <div
        className="absolute bottom-0 text-2xl pointer-events-none animate-float-up opacity-0"
        style={{
            left: `${Math.random() * 80 + 10}%`,
            animationDelay: `${delay}ms`,
            animationDuration: `${1500 + Math.random() * 1000}ms`
        }}
    >
        {emoji}
    </div>
);

export default function NotificationModal({ isOpen, onClose, title, message, type = 'success' }: NotificationModalProps) {
    const [emojis, setEmojis] = useState<{ id: number; char: string; delay: number }[]>([]);

    useEffect(() => {
        if (isOpen && type === 'success') {
            const newEmojis = Array.from({ length: 15 }).map((_, i) => ({
                id: i,
                char: ['💰', '💵', '🤑', '✨', '💸'][Math.floor(Math.random() * 5)],
                delay: i * 100
            }));
            setEmojis(newEmojis);
        } else {
            setEmojis([]);
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

            <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                {/* Money Emojis Animation Layer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {emojis.map(e => (
                        <FloatingEmoji key={e.id} emoji={e.char} delay={e.delay} />
                    ))}
                </div>

                <div className="p-1 pr-1 flex justify-end">
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pb-8 flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center animate-bounce-subtle ${type === 'success' ? 'bg-green-500/20 text-green-400' :
                            type === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                        }`}>
                        {type === 'success' ? <CheckCircle className="w-12 h-12" /> :
                            type === 'error' ? <XCircle className="w-12 h-12" /> :
                                <CheckCircle className="w-12 h-12" />}
                    </div>

                    <div className="space-y-2 relative z-10">
                        <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
                        <p className="text-gray-400 leading-relaxed font-semibold">{message}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 ${type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' :
                                type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' :
                                    'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                            }`}
                    >
                        OK
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes float-up {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(-300px) rotate(45deg); opacity: 0; }
                }
                .animate-float-up {
                    animation-name: float-up;
                    animation-timing-function: ease-out;
                    animation-fill-mode: forwards;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
