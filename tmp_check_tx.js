require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseAdmin = createClient(
        'https://xyniubvihpgoolkpisvy.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Get all pending deposits from today
    const { data: txRows, error: findErr } = await supabaseAdmin
        .from('transactions')
        .select(`
            id, 
            status, 
            amount, 
            created_at, 
            metadata,
            users ( full_name, email )
        `)
        .eq('type', 'DEPOSIT')
        .order('created_at', { ascending: false })
        .limit(20);

    if (findErr) {
        console.error("DB Query Error:", findErr);
        return;
    }

    console.log("Recent DEPOSIT transactions:");
    txRows.forEach(tx => {
        if (tx.users && tx.users.full_name && tx.users.full_name.toUpperCase().includes("FELIPE")) {
            console.log(`\n\x1b[33m*** FELIPE'S TX ***\x1b[0m`);
            console.log(JSON.stringify(tx, null, 2));
        } else if (tx.status === 'PENDING') {
            console.log(`- [${tx.created_at}] R$${tx.amount} | PENDING | xgate_id: ${tx.metadata?.xgate_id} | Name: ${tx.users?.full_name}`);
        } else {
            console.log(`- [${tx.created_at}] R$${tx.amount} | ${tx.status} | xgate_id: ${tx.metadata?.xgate_id} | Name: ${tx.users?.full_name}`);
        }
    });

}
main();
