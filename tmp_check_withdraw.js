const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseAdmin = createClient(
        'https://xyniubvihpgoolkpisvy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bml1YnZpaHBnb29sa3Bpc3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3NjY5MCwiZXhwIjoyMDg2NzUyNjkwfQ.XGB7-pLLuNMKGa6zpCiXBTcGu11OFl8z3guyxd4PTVI'
    );

    const { data: txRows, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('type', 'WITHDRAWAL')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log(JSON.stringify(txRows, null, 2));
}

main();
