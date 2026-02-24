const { createClient } = require("@supabase/supabase-js");

const s = createClient(
  "https://xyniubvihpgoolkpisvy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bml1YnZpaHBnb29sa3Bpc3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3NjY5MCwiZXhwIjoyMDg2NzUyNjkwfQ.XGB7-pLLuNMKGa6zpCiXBTcGu11OFl8z3guyxd4PTVI"
);

(async () => {
  // Find Andre Luar's PENDING deposit
  const { data: txs, error } = await s
    .from("transactions")
    .select("id, user_id, type, status, amount, created_at, metadata, users(full_name, email, balance)")
    .eq("type", "DEPOSIT")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) { console.error("Fetch error:", error); return; }

  const andre = (txs || []).find(t =>
    t.users?.full_name?.toLowerCase().includes('andre') ||
    t.users?.full_name?.toLowerCase().includes('luar')
  );

  if (!andre) {
    console.log("No PENDING deposit for Andre Luar. All PENDING deposits:");
    for (const tx of txs || []) {
      console.log(`  ${tx.users?.full_name} | R$${tx.amount} | ${tx.created_at}`);
    }
    return;
  }

  console.log(`Found: ${andre.users?.full_name} | TX ${andre.id} | R$${andre.amount} | Balance: R$${andre.users?.balance}`);

  // Mark COMPLETED
  const { error: upErr } = await s.from("transactions").update({ status: "COMPLETED" }).eq("id", andre.id);
  if (upErr) { console.error("TX update error:", upErr); return; }
  console.log("TX -> COMPLETED");

  // Credit balance
  const newBal = (Number(andre.users?.balance) || 0) + Number(andre.amount);
  const { error: balErr } = await s.from("users").update({ balance: newBal }).eq("id", andre.user_id);
  if (balErr) { console.error("Balance error:", balErr); return; }
  console.log(`Balance: R$${andre.users?.balance} -> R$${newBal}`);
  console.log("Done!");
})();
