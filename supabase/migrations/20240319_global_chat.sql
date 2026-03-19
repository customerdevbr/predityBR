-- Global Chat Messages

CREATE TABLE IF NOT EXISTS global_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 200),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Todos podem ler
CREATE POLICY "Anyone can read global chat"
ON global_chat_messages FOR SELECT
USING (true);

-- Usuários autenticados podem inserir (apenas próprias mensagens)
CREATE POLICY "Auth users can insert own messages"
ON global_chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem deletar
CREATE POLICY "Admins can delete chat messages"
ON global_chat_messages FOR DELETE
USING (is_admin());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE global_chat_messages;
