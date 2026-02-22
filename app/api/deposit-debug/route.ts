import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCpf, validateFullName } from '@/lib/cpf';

// Known fake/test CPFs to flag explicitly

// Known fake/test CPFs to flag explicitly
const KNOWN_TEST_CPFS = ['12345678909', '00000000000', '11111111111', '22222222222', '99999999999'];

function maskCpf(cpf: string): string {
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

// Build fix
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // List all users with CPF info if no userId given
    if (!userId) {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, document, balance, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const report = (users || []).map(u => {
            const raw = (u.document || '').replace(/\D/g, '');
            const cpfValid = raw ? validateCpf(raw) : null;
            const nameValid = validateFullName(u.full_name || '');
            const isTestCpf = KNOWN_TEST_CPFS.includes(raw);

            return {
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                balance: u.balance,
                cpf_masked: raw ? maskCpf(raw) : '❌ não cadastrado',
                cpf_raw_length: raw.length,
                cpf_valid: cpfValid?.valid ?? null,
                cpf_error: cpfValid?.error ?? null,
                is_test_cpf: isTestCpf,
                name_valid: nameValid.valid,
                name_error: nameValid.error ?? null,
                ready_to_deposit: !!(raw && cpfValid?.valid && !isTestCpf && nameValid.valid),
                warning: isTestCpf ? '🚨 CPF DE TESTE DETECTADO — XGate vai rejeitar' : null,
                created_at: u.created_at,
            };
        });

        return NextResponse.json({ users: report, count: report.length });
    }

    // Single user deep-dive
    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const raw = (user.document || '').replace(/\D/g, '');
    const cpfCheck = raw ? validateCpf(raw) : null;
    const nameCheck = validateFullName(user.full_name || '');
    const isTestCpf = KNOWN_TEST_CPFS.includes(raw);

    // Simulate exactly what the deposit route would send to XGate
    const xgatePayload = {
        amount: 10,
        customer: {
            name: user.full_name || 'Cliente Predity',
            email: user.email || 'email@predity.com',
            document: raw || '❌ VAZIO',
            phone: user.phone || null,
        }
    };

    return NextResponse.json({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        balance: user.balance,
        cpf_analysis: {
            stored_raw: raw || '(vazio)',
            masked: raw ? maskCpf(raw) : '(vazio)',
            length: raw.length,
            is_test_cpf: isTestCpf,
            test_cpf_warning: isTestCpf ? '🚨 ESTE É UM CPF DE TESTE — a XGate irá rejeitar' : null,
            checksum_valid: cpfCheck?.valid ?? null,
            checksum_error: cpfCheck?.error ?? null,
        },
        name_analysis: {
            name: user.full_name || '(vazio)',
            valid: nameCheck.valid,
            error: nameCheck.error ?? null,
        },
        ready_to_deposit: !!(raw && cpfCheck?.valid && !isTestCpf && nameCheck.valid),
        xgate_payload_preview: xgatePayload,
        recent_deposits: await supabaseAdmin
            .from('transactions')
            .select('id, amount, status, created_at, metadata')
            .eq('user_id', userId)
            .eq('type', 'DEPOSIT')
            .order('created_at', { ascending: false })
            .limit(10)
            .then(r => r.data || []),
    });
}
