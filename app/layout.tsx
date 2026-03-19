import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SupportChat from "@/components/SupportChat";
import GlobalChat from "@/components/GlobalChat";
import { createClient } from "@/lib/supabase/server";
import Script from "next/script";

const SITE_URL = "https://preditybr.com";
const SITE_NAME = "PredityBR";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "PredityBR — Mercados de Previsão em Tempo Real com PIX",
        template: "%s | PredityBR",
    },
    description:
        "Plataforma brasileira de mercados de previsão. Dê seus palpites em política, futebol, economia e mais. Depósito e saque via PIX instantâneo. Odds formadas pela comunidade.",
    keywords: [
        "mercado de previsão",
        "prediction market brasil",
        "palpite online com dinheiro",
        "prever resultados",
        "palpite futebol",
        "palpite política brasil",
        "pix instantâneo",
        "ganhar dinheiro prevendo",
        "previsão esportiva",
        "odds comunidade",
        "preditybr",
    ],
    authors: [{ name: "PredityBR", url: SITE_URL }],
    creator: "PredityBR",
    publisher: "PredityBR",
    category: "finance",
    applicationName: SITE_NAME,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
        },
    },
    alternates: {
        canonical: SITE_URL,
        languages: {
            "pt-BR": SITE_URL,
        },
    },
    icons: {
        icon: [
            { url: "/favicon.png", type: "image/png" },
        ],
        apple: "/favicon.png",
    },
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: SITE_URL,
        siteName: SITE_NAME,
        title: "PredityBR — Mercados de Previsão em Tempo Real com PIX",
        description:
            "Plataforma brasileira de prediction markets. Preveja política, futebol, economia e mais. PIX instantâneo, odds em tempo real, suporte 100% BR.",
        images: [
            {
                url: `${SITE_URL}/og-image.png`,
                width: 1200,
                height: 630,
                alt: "PredityBR — Mercados de Previsão com PIX",
                type: "image/png",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "@preditybr",
        creator: "@preditybr",
        title: "PredityBR — Mercados de Previsão em Tempo Real com PIX",
        description:
            "Preveja o futuro com a comunidade brasileira. PIX instantâneo, odds em tempo real.",
        images: [`${SITE_URL}/og-image.png`],
    },
    verification: {
        google: "google-site-verification-placeholder",
    },
};

// JSON-LD Structured Data: WebSite + Organization
const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
        "Plataforma brasileira de mercados de previsão em tempo real com pagamentos via PIX.",
    inLanguage: "pt-BR",
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/app/markets?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
    },
};

const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 200,
        height: 60,
    },
    contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: "Portuguese",
        url: `${SITE_URL}/contact`,
    },
    sameAs: [],
    areaServed: "BR",
    foundingDate: "2026",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <html lang="pt-BR" dir="ltr">
            <head>
                {/* Preconnect para recursos críticos */}
                <link rel="preconnect" href="https://xyniubvihpgoolkpisvy.supabase.co" />
                <link rel="preconnect" href="https://challenges.cloudflare.com" />
                <link rel="dns-prefetch" href="https://api.dicebear.com" />

                {/* Structured Data */}
                <Script
                    id="schema-website"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
                />
                <Script
                    id="schema-organization"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
                />
            </head>
            <body className="font-sans antialiased min-h-screen flex flex-col">
                <Header user={user} />

                <main className="flex-1" id="main-content" role="main">
                    {children}
                </main>

                <BottomNav />
                <SupportChat user={user} />
                <GlobalChat userId={user?.id ?? null} />
            </body>
        </html>
    );
}
