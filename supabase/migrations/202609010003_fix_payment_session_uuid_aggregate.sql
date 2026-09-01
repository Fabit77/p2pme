-- PostgreSQL has no min(uuid) aggregate. Compare UUIDs as text and cast back.
do $fix$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_checkout_payment_session(uuid,uuid[],uuid,text,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'min(ticket_reservations.payment_session_id)',
    'min(ticket_reservations.payment_session_id::text)::uuid'
  );

  if function_definition not like '%min(ticket_reservations.payment_session_id::text)::uuid%'
  then
    raise exception 'CHECKOUT_UUID_AGGREGATE_PATCH_DID_NOT_MATCH';
  end if;

  execute function_definition;
end
$fix$;
