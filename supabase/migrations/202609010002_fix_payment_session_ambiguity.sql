-- Patch the existing function without replacing its full body manually.
do $fix$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_checkout_payment_session(uuid,uuid[],uuid,text,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'min(payment_session_id)',
    'min(ticket_reservations.payment_session_id)'
  );
  function_definition := replace(
    function_definition,
    'count(payment_session_id)',
    'count(ticket_reservations.payment_session_id)'
  );
  function_definition := replace(
    function_definition,
    'count(distinct payment_session_id)',
    'count(distinct ticket_reservations.payment_session_id)'
  );

  if (function_definition not like '%min(ticket_reservations.payment_session_id)%'
    and function_definition not like '%min(ticket_reservations.payment_session_id::text)::uuid%')
    or function_definition not like '%count(ticket_reservations.payment_session_id)%'
    or function_definition not like '%count(distinct ticket_reservations.payment_session_id)%'
  then
    raise exception 'CHECKOUT_FUNCTION_PATCH_DID_NOT_MATCH';
  end if;

  execute function_definition;
end
$fix$;
