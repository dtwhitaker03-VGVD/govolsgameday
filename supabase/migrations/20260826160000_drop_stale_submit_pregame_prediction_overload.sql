/*
# Drop stale submit_pregame_prediction(6-arg) overload

## Summary
20260826151500_update_pregame_prediction_rpcs_v2.sql added a new 11-arg
overload of submit_pregame_prediction (5 new params with defaults) via
CREATE OR REPLACE, which — because Postgres distinguishes overloads by
argument count, not by defaults — left the original 6-arg version (from
20260707032910_prediction_engine_drive_windows_and_rpcs.sql) in place
alongside it as a separate function.

The only caller (src/components/predictions/PreGamePredictions.tsx) has
always invoked the RPC with all 11 named parameters, so PostgREST resolves
it to the 11-arg overload and the 6-arg one is unreachable dead code.
Dropping it removes the ambiguity for any future caller that might
otherwise accidentally hit the version with no spread/total/TD/turnover
grading inputs.
*/

DROP FUNCTION IF EXISTS public.submit_pregame_prediction(
  UUID, VARCHAR(4), INTEGER, INTEGER, INTEGER, INTEGER
);
