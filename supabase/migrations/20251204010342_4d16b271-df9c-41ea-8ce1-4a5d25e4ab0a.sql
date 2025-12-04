-- Fix generate_verification_token function to set search_path for security
CREATE OR REPLACE FUNCTION public.generate_verification_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$function$;