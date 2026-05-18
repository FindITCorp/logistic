-- Add sequential pool_number for human-readable reference (Pool #001)
alter table pools add column if not exists pool_number serial;

-- Update existing demo pools to have readable numbers
-- (serial handles new ones automatically)
