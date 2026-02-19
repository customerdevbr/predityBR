-- INIT SUPPORT SYSTEM (Tickets & Messages)

-- 1. Create Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Sem Assunto',
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update Messages Table to link to Tickets
-- We add ticket_id. For existing messages, we might need a migration strategy, 
-- but since we are dev-ing, we can make it nullable first or just delete old mock data.
-- Let's make it nullable for safety, but enforce it for new messages later if needed.
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES support_tickets(id);

-- 3. RLS for Tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
ON support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
ON support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view ALL tickets
CREATE POLICY "Admins can view all tickets"
ON support_tickets FOR SELECT
USING (is_admin());

-- Admins can update tickets (Resolve, Close)
CREATE POLICY "Admins can update tickets"
ON support_tickets FOR UPDATE
USING (is_admin());

-- 4. RLS Update for Messages (Include ticket_id check if strict, but ownership check is usually enough)
-- We already have "Users can view own messages", which works.
-- We ensure "Users can insert own messages" is still valid.

-- 5. Trigger to update Ticket's 'updated_at' when a new message arrives
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_tickets
    SET updated_at = now()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ticket_on_message ON support_messages;
CREATE TRIGGER update_ticket_on_message
AFTER INSERT ON support_messages
FOR EACH ROW
WHEN (NEW.ticket_id IS NOT NULL)
EXECUTE FUNCTION update_ticket_timestamp();
