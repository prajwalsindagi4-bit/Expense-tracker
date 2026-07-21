-- Run this in your Supabase SQL Editor to create the AI Feedback loop table

CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    transaction_id text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own AI feedback"
    ON public.ai_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own feedback
CREATE POLICY "Users can read their own AI feedback"
    ON public.ai_feedback FOR SELECT
    USING (auth.uid() = user_id);
