-- Chunk F preamble: add 'inquiry' value to the job_state enum so the
-- subsequent migration can reference it freely. Must be in its own
-- transaction.
alter type job_state add value if not exists 'inquiry' before 'confirmed';
