-- Baseline migration: capture the current database state as the starting point.
-- All existing tables and data are preserved as-is.

-- This migration intentionally does NOT include the inspirations table column changes
-- from enum to String[]. Those will be applied in a separate migration.
