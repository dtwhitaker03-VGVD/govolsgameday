-- cfbd_request_log had RLS disabled, leaving it fully readable/writable by
-- the anon key. It's only ever written by live-cfbd-sync via the
-- service-role key (which bypasses RLS entirely) and isn't read by the
-- frontend, so locking it down with no policies breaks nothing.
ALTER TABLE public.cfbd_request_log ENABLE ROW LEVEL SECURITY;
