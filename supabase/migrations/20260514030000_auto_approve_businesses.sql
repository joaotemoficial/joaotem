-- ============================================================================
-- JoaoTem — Auto-approve businesses by default
--
-- The subscription gate (effective_plan_tier on businesses) is now the real
-- visibility control: a business with no active subscription is hidden from
-- every public surface regardless of `status`. The pending→approved
-- moderation workflow that predated subscriptions is therefore a redundant
-- second gate for the common case.
--
-- New businesses default to status='approved'. Admin can still suspend or
-- reject in edge cases via the existing actions on /admin/businesses/:id.
-- Existing pending rows are left untouched and remain reachable via the
-- /admin/businesses?status=pending filter.
-- ============================================================================

alter table public.businesses alter column status set default 'approved';

-- Owner-insert RLS check: was status='pending', now status='approved'.
drop policy "businesses: owner insert own" on public.businesses;
create policy "businesses: owner insert own" on public.businesses
  for insert with check (
    user_id = auth.uid()
    and status = 'approved'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
  );
