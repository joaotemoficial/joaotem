-- ============================================================================
-- Fix: protect_business_moderation_fields() should also allow direct
-- service-role / postgres access (auth.uid() is null), since those bypass RLS
-- entirely and have admin authority. The trigger only needs to guard against
-- owners self-modifying their own moderation fields when they have a JWT.
-- ============================================================================

create or replace function public.protect_business_moderation_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Service-role / direct postgres connections have no JWT — let them through.
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.rejection_reason is distinct from old.rejection_reason
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'moderation fields are not editable by non-admins';
  end if;
  return new;
end;
$$;
