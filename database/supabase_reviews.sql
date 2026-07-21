-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Since we are using a custom users table with a server-side JWT auth architecture
-- (not Supabase Auth), we don't need RLS tied to auth.uid(). 
-- The backend uses the service key and handles authorization before inserting.
