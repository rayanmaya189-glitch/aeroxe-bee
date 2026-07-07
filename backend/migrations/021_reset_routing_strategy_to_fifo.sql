-- Reset all routing strategies to FIFO
-- The routing strategy enum has been simplified to a single FIFO strategy.
-- This migration updates any existing rows that still use old strategy values
-- (fastest_delivery, lowest_cost, highest_reliability, geo_affinity, profit_optimized).

UPDATE plans SET default_routing_strategy = 'fifo' WHERE default_routing_strategy != 'fifo';
UPDATE subscriptions SET default_routing_strategy = 'fifo' WHERE default_routing_strategy != 'fifo';
