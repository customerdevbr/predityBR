"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DebugCookiePage() {
    const [cookies, setCookies] = useState<string>('');
    const [authState, setAuthState] = useState<any>(null);

    useEffect(() => {
        setCookies(document.cookie);

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        supabase.auth.getSession().then(({ data }) => {
            setAuthState(data);
        });
    }, []);

    return (
        <div className="p-10 bg-black text-white min-h-screen font-mono">
            <h1 className="text-2xl font-bold mb-4">Debug Cookies (Client Side)</h1>

            <div className="mb-8">
                <h2 className="text-xl text-green-400 mb-2">Document.cookie:</h2>
                <div className="bg-gray-900 p-4 rounded break-all border border-gray-700">
                    {cookies || "No cookies found"}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-xl text-blue-400 mb-2">Supabase User Session:</h2>
                <pre className="bg-gray-900 p-4 rounded overflow-auto border border-gray-700 max-h-96 text-xs">
                    {JSON.stringify(authState, null, 2)}
                </pre>
            </div>

            <div className="mb-8">
                <h2 className="text-xl text-yellow-400 mb-2">Environment:</h2>
                <ul className="list-disc pl-5">
                    <li>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'SSR'}</li>
                    <li>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'SSR'}</li>
                </ul>
            </div>
        </div>
    );
}
