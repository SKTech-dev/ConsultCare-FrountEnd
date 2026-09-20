# ConsultCare frontend preview

Run `npm.cmd run dev` on Windows, then open the URL printed by Vite.
Open `/app` for the workspace or `/` for the landing page.

The app is always signed in, as requested. Login/signup URLs redirect to the
workspace. No database, credentials, payment gateway, or API server is required.
The old chatbot source remains in the repository but is no longer routed.

## Try the whole flow

1. Open Find a doctor as Alex Morgan. Choose Dr. Anjali Perera and a session.
2. Confirm the booking, then simulate a successful payment.
3. Use View as at the top to switch to Sam Taylor. Book the same doctor/session
   and pay. Sam sees position 2, without seeing Alex's identity.
4. Switch to Dr. Anjali Perera. Open Consultation queue and call the next person.
5. Open the room, send a message, upload a sample PDF/image, and save notes.
6. Switch back to Alex, open My consultations, and join the same room. Reply
   to the message and test the local camera preview if desired.
7. Switch back to the doctor, reopen the room, and complete the consultation.
   Alex's record moves to history and Sam becomes next.
8. Switch to Administrator to approve the pending doctor, suspend/restore
   accounts, review support requests, and simulate refunds for cancellations.
9. Repeat with a lawyer; professional documents replace clinical prescriptions.

## Implemented locally

- Three sample patients, three doctors, two lawyers, and an administrator workspace.
- Profiles, credential review, optional professional photo, and editable fees.
- Professional search with speciality, language, fee, and online filters.
- Session creation, overlap checks, and online/offline controls.
- Booking, duplicate protection, capacity checks, failed/successful mock payments.
- Separate queues per professional and session, no-show/cancel/complete actions.
- Local chat, document uploads/downloads, shared/private notes, and follow-up text.
- History, support requests, account moderation, and mock refunds.

Workspace data persists in localStorage under `consultcare.workspace.v1`.
Files persist in IndexedDB under `consultcare-preview-files`. Camera and microphone
tracks stop when leaving the room. Profiles and documents must contain sample data
only. Storage is specific to this browser, and clearing site data removes it.

## What remains for a real deployment

This is a functional frontend prototype, not a secure production consultation
service. The visible workspace switcher intentionally allows inspection of all
sample roles. UI ownership checks are not a security boundary.

Backend work must implement identity/session management, role and record access,
professional verification evidence, transactional queues, WebSocket updates,
WebRTC signalling and TURN, secured/scanned file storage, payment webhooks/refunds,
and durable audit/consultation records. Remote video is not implemented: the room
offers an explicitly labelled local device preview. Chat and queue changes are
simulated within one browser tab; they do not synchronize across devices.

Run `node --test tests/consultations.test.js` for the workflow checks.
