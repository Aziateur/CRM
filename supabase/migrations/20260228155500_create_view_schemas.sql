-- Create the view_schemas table to store layout configurations
CREATE TABLE IF NOT EXISTS public.view_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    view_type TEXT NOT NULL CHECK (view_type IN ('lead_drawer', 'leads_table', 'add_lead')),
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, view_type)
);

-- Enable RLS
ALTER TABLE public.view_schemas ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since the app uses anon key heavily with project_id filtering)
CREATE POLICY "Enable read access for all users" ON public.view_schemas FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.view_schemas FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.view_schemas FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.view_schemas FOR DELETE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER view_schemas_updated_at
    BEFORE UPDATE ON public.view_schemas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
