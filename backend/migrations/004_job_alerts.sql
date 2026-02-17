-- Job Alerts table for email notifications
CREATE TABLE job_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert criteria
    keywords TEXT[] DEFAULT '{}',
    locations TEXT[] DEFAULT '{}',
    job_types TEXT[] DEFAULT '{}',
    remote_only BOOLEAN DEFAULT FALSE,
    min_salary INTEGER,
    
    -- Settings
    frequency VARCHAR(20) DEFAULT 'daily',  -- instant, daily, weekly
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Tracking
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_job_alerts_active ON job_alerts(is_active) WHERE is_active = TRUE;
