-- FIX: Add missing updated_at column to support_tickets

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'updated_at') THEN
        ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;
