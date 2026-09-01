-- Qualify the final bare output-column reference in the existing function.
do $fix$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_checkout_payment_session(uuid,uuid[],uuid,text,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'and payment_session_id is not null',
    'and ticket_reservations.payment_session_id is not null'
  );

  if function_definition not like '%and ticket_reservations.payment_session_id is not null%'
  then
    raise exception 'CHECKOUT_PAYMENT_SESSION_FILTER_PATCH_DID_NOT_MATCH';
  end if;

  execute function_definition;
end
$fix$;
