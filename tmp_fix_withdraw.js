const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseAdmin = createClient(
        'https://xyniubvihpgoolkpisvy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bml1YnZpaHBnb29sa3Bpc3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3NjY5MCwiZXhwIjoyMDg2NzUyNjkwfQ.XGB7-pLLuNMKGa6zpCiXBTcGu11OFl8z3guyxd4PTVI'
    );

    // Get pending withdrawals from today
    const { data: txRows, error } = await supabaseAdmin
        .from('transactions')
        .select('id, amount, status')
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'PENDING');

    console.log('Pending withdrawals to fix:', txRows);

    if (txRows && txRows.length > 0) {
        for (const tx of txRows) {
            console.log(`Setting ${tx.id} to COMPLETED`);
            await supabaseAdmin.from('transactions').update({ status: 'COMPLETED' }).eq('id', tx.id);
        }
        console.log('Done!');
    }
}

main();
