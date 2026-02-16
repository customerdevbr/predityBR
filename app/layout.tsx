import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Fallback
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SupportChat from "@/components/SupportChat";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "PredityBR - Realtime Prediction Markets",
    description: "Mercados de previsão em tempo real.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <html lang="pt-BR">
            <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
                <Header user={user} />

                <main className="flex-1">
                    {children}
                </main>

                <BottomNav />
                <SupportChat user={user} />

            </body>
        </html>
    );
}
