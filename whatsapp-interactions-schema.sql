-- Create WhatsApp Interactions table for tracking user commands and responses
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('command', 'button_click', 'list_selection', 'feature_use')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_timestamp ON whatsapp_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_type ON whatsapp_interactions(interaction_type);

-- Create Row Level Security policy
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to manage all data
CREATE POLICY "Service role can manage whatsapp interactions" ON whatsapp_interactions
  FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to read their own interactions
CREATE POLICY "Users can view their own interactions" ON whatsapp_interactions
  FOR SELECT USING (auth.uid()::text = phone_number);

-- Grant permissions
GRANT ALL ON whatsapp_interactions TO service_role;
GRANT SELECT ON whatsapp_interactions TO authenticated;
GRANT USAGE ON SEQUENCE whatsapp_interactions_id_seq TO service_role;