-- =========================================================================
-- FINEXA Supabase Row Level Security (RLS) Policies and Database Triggers
-- =========================================================================

-- 1. Enable Row Level Security on all organisation-scoped tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table: Users can read and update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 3. Trigger: Automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, name, created_at, updated_at)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'), now(), now())
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Organisation Members: Users can see memberships for orgs they belong to
CREATE POLICY "Users can view memberships of their orgs"
    ON organisation_members FOR SELECT
    USING (
        organisation_id IN (
            SELECT om.organisation_id FROM organisation_members om WHERE om.user_id = auth.uid()
        )
    );

-- 5. Helper Function: Check if auth.uid() belongs to the organisation
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organisation_members
        WHERE organisation_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Generic Org Policies (Transactions, Customers, Invoices, Payments, Scenarios, Audits)
CREATE POLICY "Org members can access transactions"
    ON transactions FOR ALL
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access customers"
    ON customers FOR ALL
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access invoices"
    ON invoices FOR ALL
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access payments"
    ON payments FOR ALL
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access scenarios"
    ON financial_scenarios FOR ALL
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access audit log"
    ON audit_log FOR SELECT
    USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can access notifications"
    ON notifications FOR ALL
    USING (public.is_org_member(organisation_id) AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Users can access their own AI conversations"
    ON ai_conversations FOR ALL
    USING (public.is_org_member(organisation_id) AND user_id = auth.uid());

CREATE POLICY "Org members can access webhook deliveries"
    ON webhook_deliveries FOR ALL
    USING (public.is_org_member(organisation_id));

-- PayPal webhook events are managed by the API service role
ALTER TABLE paypal_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages paypal webhook events"
    ON paypal_webhook_events FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

