import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Fallback
import "./globals.css";
import Header from "@/components/Header";

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

                <main className="flex-1 container mx-auto px-4 py-8">
                    {children}
                </main>

                <footer className="border-t border-surface py-8 mt-12 bg-secondary/30">
                    <div className="container mx-auto px-4 text-center text-sm text-gray-500">
                        &copy; 2026 PredityBR. Todos os direitos reservados.
                    </div>
                </footer>
            </body>
        </html>
    );
}
