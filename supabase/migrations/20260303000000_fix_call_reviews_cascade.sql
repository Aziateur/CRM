-- Fix missing CASCADE on call_reviews.attempt_id FK
ALTER TABLE call_reviews DROP CONSTRAINT IF EXISTS call_reviews_attempt_id_fkey;
ALTER TABLE call_reviews
  ADD CONSTRAINT call_reviews_attempt_id_fkey
  FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE;
