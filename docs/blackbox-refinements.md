# Black-box feedback release notes

## Deployment prerequisite

These frontend changes require the matching backend changes, including migration
`p110_room_revisions` (parent `o109_payment_integrity`). The migration adds upload
retry identifiers, prescription revision history, and sandbox/live settlement
separation. It has NOT been applied by this implementation task.

Before starting the updated backend, review the target database/branch and apply
the migration through your normal controlled deployment process. From backEnd:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Do not point automated tests at the configured shared database. Preserve a backup
and test the migration on an isolated database first. This migration deliberately
refuses automatic downgrade because it could discard prescription/payment history.

## Implemented changes

- Sidebar controls beside the logo, hidden scrollbar, responsive notification
  menu, and an account menu with profile image and sign-out.
- Keyboard-accessible tabs on multi-section workspace pages; visited tabs retain
  unsaved drafts. Required field indicators and contact-number validation.
- Stable professional image sizing and case-insensitive language filtering.
- Booking/payment progress feedback and offline-specific connectivity feedback.
- A fullscreen consultation workspace with tools beside persistent video,
  local chat/prescription progress, and age in years and months.
- Upload progress, filename, sender, failure details and retry using the same
  identifier. Professionals can change visibility of their own documents during
  an active consultation; patient uploads cannot be made private by them.
- Prescription revisions before completion. Superseded versions remain listed,
  but only the current prescription content/download is exposed in the UI.
- Completion-based sandbox earnings and separately labelled sandbox settlements.
  Sandbox amounts never become live payouts or claim actual money was transferred.
- Clearer appointment, handover, document and payment notifications.

## Multi-computer lab checks still required

1. Sign in as a patient, original professional, receiving professional and admin
   in separate browser profiles. Check notifications and unread counts live.
2. Reschedule a paid appointment; verify the patient sees old/new date and time,
   with no request to pay again. Accept a handover and check professional names,
   reason, preserved queue order, and payment attribution.
3. Join a real sandbox video call. Change tool tabs and enter/leave fullscreen;
   confirm video/audio remain connected and controls work on both devices.
4. Upload as each participant. Check filename/spinner, sender attribution and
   cross-device delivery. Interrupt networking, retry, and check for duplicates.
5. Share then make a professional-owned document private. Confirm the patient
   loses access and an already open preview closes after workspace refresh.
   Previously downloaded files cannot be revoked.
6. Send and revise a prescription; check current PDF and superseded metadata.
   Try editing from two tabs and after consultation completion.
7. Complete sandbox consultations and clinics, inspect completion-month earnings,
   record a sandbox settlement, and verify it cannot mix with live accounting.
8. Repeat core flows at narrow phone widths and using only the keyboard. Change
   forms, switch tabs, and navigate away to check draft preservation/warnings.

Browser automation mocks backend/external services. Offline backend tests do not
replace PostgreSQL migration/concurrency tests or real Daily/PayHere sandbox checks.
