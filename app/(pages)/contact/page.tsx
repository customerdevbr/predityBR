import type { Metadata } from 'next';
import ContactPageClient from '@/components/ContactPageClient';

export const metadata: Metadata = {
    title: 'Fale Conosco',
    description:
        'Entre em contato com o suporte da PredityBR. Chat ao vivo, e-mail e atendimento em português 24h para dúvidas, problemas e sugestões.',
    alternates: {
        canonical: 'https://preditybr.com/contact',
    },
    openGraph: {
        title: 'Fale Conosco | PredityBR',
        description: 'Atendimento em português, rápido e eficiente. Chat ao vivo ou e-mail.',
        url: 'https://preditybr.com/contact',
        locale: 'pt_BR',
    },
};

export default function ContactPage() {
    return <ContactPageClient />;
}
