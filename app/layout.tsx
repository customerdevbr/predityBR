import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Fallback
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SupportChat from "@/components/SupportChat";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "PredityBR - Realtime Prediction Markets",
    description: "Apostas binárias em tempo real.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
                <Header />

                <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
                    {children}
                </main>

                <BottomNav />
                <SupportChat />

            </body>
        </html>
    );
}
