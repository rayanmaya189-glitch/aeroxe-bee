-- 036_drop_otp_metadata_fk.sql
-- The FK constraint otp_metadata.message_id -> messages(id) causes OTP send
-- endpoints to fail because they insert into otp_metadata without creating a
-- message first. OTP metadata is independent of the messages table — it only
-- needs to store the code hash, phone, and verification state.
--
-- The FK also cascades deletes, meaning deleting a message would silently
-- destroy OTP verification records, which is incorrect.

ALTER TABLE otp_metadata DROP CONSTRAINT IF EXISTS otp_metadata_message_id_fkey;
