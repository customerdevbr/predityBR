const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xyniubvihpgoolkpisvy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bml1YnZpaHBnb29sa3Bpc3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3NjY5MCwiZXhwIjoyMDg2NzUyNjkwfQ.XGB7-pLLuNMKGa6zpCiXBTcGu11OFl8z3guyxd4PTVI'
);

async function migrate() {
  console.log('Applying referral system migration...');

  // Add referral_code column
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (authUsers) {
    for (const user of authUsers.users) {
      // Generate a referral code based on the user's id
      const code = user.id.replace(/-/g, '').toUpperCase().slice(0, 8);
      console.log(`Setting referral code for ${user.email}: ${code}`);

      await supabase
        .from('users')
        .update({ referral_code: code })
        .eq('id', user.id)
        .is('referral_code', null);
    }
  }

  console.log('Done! Referral codes set for existing users.');
  console.log('\nIMPORTANT: Please run the SQL file manually in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/xyniubvihpgoolkpisvy/sql/new');
  console.log('\nSQL file location: supabase/migrations/20240220_add_referral_system.sql');
}

migrate().catch(console.error);
