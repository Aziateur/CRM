-- Add attempt_id to call_sessions if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'call_sessions' and column_name = 'attempt_id') then
        alter table call_sessions add column attempt_id uuid references attempts(id) on delete set null;
    end if;
end $$;

-- Create index on attempt_id
create index if not exists idx_call_sessions_attempt_id on call_sessions(attempt_id);

-- Create unique index on openphone_call_id
create unique index if not exists idx_call_sessions_openphone_call_id on call_sessions(openphone_call_id) where openphone_call_id is not null;
