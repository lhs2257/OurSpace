-- Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Create policies

-- 1. Select: Everyone authenticated can view all daily logs
CREATE POLICY "Users can view all daily logs"
ON public.daily_logs
FOR SELECT
TO authenticated
USING (true);

-- 2. Insert: Users can only insert their own logs
CREATE POLICY "Users can create their own daily logs"
ON public.daily_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Update: Users can only update their own logs
CREATE POLICY "Users can update their own daily logs"
ON public.daily_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Delete: Users can only delete their own logs
CREATE POLICY "Users can delete their own daily logs"
ON public.daily_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster querying by date and user_id
CREATE INDEX IF NOT EXISTS daily_logs_date_idx ON public.daily_logs(date);
CREATE INDEX IF NOT EXISTS daily_logs_user_id_idx ON public.daily_logs(user_id);
