
-- Create whatsapp_interactions table for logging bot interactions
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
    id SERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_type ON whatsapp_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_timestamp ON whatsapp_interactions(timestamp);

-- Enable Row Level Security
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_interactions table
CREATE POLICY "Service role can do everything on whatsapp_interactions" ON whatsapp_interactions
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Authenticated can view interactions" ON whatsapp_interactions
  FOR SELECT TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON whatsapp_interactions TO service_role;
GRANT SELECT ON whatsapp_interactions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_interactions_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_interactions_id_seq TO authenticated;
