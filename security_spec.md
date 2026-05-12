# FitCore Gym Management Security Specification

## 1. Data Invariants
- **User Role**: A user's role can only be assigned by an admin or set to 'member' by default during registration. Once set, only an admin can change it.
- **Member Records**: Every member must have a corresponding user ID. Expiry dates must be in the future during creation.
- **Attendance**: Attendance can only be logged for active members.
- **Payments**: Payments must be linked to a member. Status transitions are restricted (e.g., from 'paid' to 'pending' is usually not allowed).
- **Plans**: Workout and Diet plans can only be created/updated by admins or trainers.
- **Notifications**: Users can only read their own notifications.

## 2. The Dirty Dozen Payloads (Targeted for Denial)
1. **The Role Escalator**: A member trying to update their own role to 'admin'.
2. **The Shadow Member**: Creating a member record with a UID that doesn't match the authenticated user (unless done by admin).
3. **The Eternal Membership**: Setting an expiry date to year 2999.
4. **The Ghost Payment**: Creating a 'paid' payment record without a real transaction.
5. **The Cross-User Snooping**: A member trying to read another member's workout plan.
6. **The Attendance Spoofer**: Logging attendance for a date in the past or future.
7. **The Bulk Deletion**: Attempting to delete the entire 'members' collection.
8. **The PII Leak**: Reading the 'users' collection without holding an admin role.
9. **The Plan Hijacker**: A member trying to modify their own assigned workout plan.
10. **The Spam Bot**: Creating thousands of notifications for other users.
11. **The ID Poisoner**: Using a 1MB string as a document ID.
12. **The Future Payment**: Recording a payment date in the year 2030.
