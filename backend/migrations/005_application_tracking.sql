-- Application Tracking Enhancement Migration
-- Adds click tracking and analytics support

-- Add click tracking columns to applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS confirmed_applied BOOLEAN DEFAULT FALSE;

-- Create job_views table for analytics
CREATE TABLE IF NOT EXISTS job_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    source VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_job_views_user_id ON job_views(user_id);
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at DESC);

-- Create apply_clicks table for tracking external redirects
CREATE TABLE IF NOT EXISTS apply_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_applied BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    apply_url VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS idx_apply_clicks_user_id ON apply_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_apply_clicks_job_id ON apply_clicks(job_id);
CREATE INDEX IF NOT EXISTS idx_apply_clicks_clicked_at ON apply_clicks(clicked_at DESC);

-- RLS for new tables
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE apply_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job_views" ON job_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own job_views" ON job_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own apply_clicks" ON apply_clicks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own apply_clicks" ON apply_clicks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own apply_clicks" ON apply_clicks FOR UPDATE USING (auth.uid() = user_id);

-- Analytics view for dashboard
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT jv.job_id) as jobs_viewed,
    COUNT(DISTINCT ac.job_id) as jobs_clicked,
    COUNT(DISTINCT CASE WHEN ac.confirmed_applied THEN ac.job_id END) as jobs_applied,
    COUNT(DISTINCT CASE WHEN a.status IN ('phone_screen', 'technical', 'onsite') THEN a.job_id END) as interviews,
    COUNT(DISTINCT CASE WHEN a.status = 'offer' THEN a.job_id END) as offers,
    COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.job_id END) as rejections
FROM auth.users u
LEFT JOIN job_views jv ON u.id = jv.user_id
LEFT JOIN apply_clicks ac ON u.id = ac.user_id
LEFT JOIN applications a ON u.id = a.user_id
GROUP BY u.id;
