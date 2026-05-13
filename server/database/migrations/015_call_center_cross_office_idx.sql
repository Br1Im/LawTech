CREATE INDEX idx_call_center_leads_office_status ON call_center_leads(office_id, status);

CREATE INDEX idx_call_center_leads_assigned_status ON call_center_leads(assigned_to, status);

CREATE INDEX idx_call_center_leads_created_at ON call_center_leads(created_at DESC);

CREATE INDEX idx_users_role_office ON users(role, office_id);
