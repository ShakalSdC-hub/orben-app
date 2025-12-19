-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to clean old audit logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Schedule the cleanup to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-audit-logs-daily',
  '0 3 * * *',
  $$SELECT public.cleanup_old_audit_logs()$$
);