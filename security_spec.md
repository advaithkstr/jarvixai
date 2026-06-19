# Firebase Security Specification (security_spec.md)

## 1. Data Invariants

1. **Self-Ownership Constraint**: A user can only read, create, update, or delete their own user profile document at `/users/{userId}`, contacts at `/users/{userId}/contacts/{contactId}`, devices at `/users/{userId}/devices/{deviceId}`, and interaction history records at `/users/{userId}/interactions/{interactionId}` where `request.auth.uid == userId`.
2. **Key Validation & Safety Checks**: 
   - All text inputs must be size-bounded (e.g., text size <= 5000 characters) to prevent Denial of Wallet buffer attacks.
   - All document IDs must fit `isValidId()` requirements.
   - `createdAt` and `updatedAt` must sync with request's `server_timestamp` at transactions.
3. **Privilege Isolation**: No user can elevate authorization. Users cannot set themselves as administrators or manipulate security layers.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to break our system's identity and data integrity invariants and must return standard `PERMISSION_DENIED` inside security rules.

### Payload 1: Steal Profile of Another User
* **Target Path**: `/users/attacker_uid` (logged in as `victim_uid`)
* **Attack Vector**: Cross-user profile overwriting.
* **Result**: PERMISSION_DENIED.

### Payload 2: Ghost Field Injection in Profile
* **Target Path**: `/users/victim_uid`
* **Payload**: `{ "userId": "victim_uid", "email": "victim@example.com", "createdAt": "2026-06-13T10:00:00Z", "updatedAt": "2026-06-13T10:00:00Z", "role": "admin" }`
* **Attack Vector**: Injecting unauthorized privilege fields during user profile write.
* **Result**: PERMISSION_DENIED (enforced via tight `affectedKeys().hasOnly()` or strict schema size checking).

### Payload 3: Spoof Email Authentication State
* **Target Path**: `/users/stark_uid`
* **Payload**: `{ "starkEmail": "tony@stark.com" }` with `request.auth.token.email_verified == false`.
* **Attack Vector**: Bypass verified email strict gates.
* **Result**: PERMISSION_DENIED.

### Payload 4: Invalid Path Token Poisoning
* **Target Path**: `/users/victim_uid/devices/veryLargeJunkNameTooLongThatExhaustsFirestoreCredits...`
* **Attack Vector**: Path parameter Denial of Wallet attack.
* **Result**: PERMISSION_DENIED (blocked by ID size bounds).

### Payload 5: Sone-Else's Contact Impersonation
* **Target Path**: `/users/victim_uid/contacts/mom`
* **Payload**: `{ "contactId": "mom", "name": "Fake Mom" }` by an attacker with uid `attacker_uid`.
* **Attack Vector**: Cross-origin sub-collection reading or writing.
* **Result**: PERMISSION_DENIED.

### Payload 6: Mutate Immortal Field `createdAt`
* **Target Path**: `/users/victim_uid`
* **Payload**: `{ "createdAt": "1999-01-01T00:00:00Z" }` (Updating `createdAt` to a legacy time).
* **Attack Vector**: Breaking temporal consistency of immutable log attributes.
* **Result**: PERMISSION_DENIED.

### Payload 7: Client Spoofed Micro-Timestamps
* **Target Path**: `/users/victim_uid/devices/lights`
* **Payload**: `{ "updatedAt": "2099-12-31T23:59:59Z" }` with client payload instead of server timestamp.
* **Attack Vector**: Spoofing server timing to gain lock priority.
* **Result**: PERMISSION_DENIED (rules require `updatedAt == request.time`).

### Payload 8: Massive Buffer Attack on Device Names
* **Target Path**: `/users/victim_uid/devices/light`
* **Payload**: `{ "name": "a".repeat(1000000) }` (1MB name payload).
* **Attack Vector**: Triggering document-exhaustion limits.
* **Result**: PERMISSION_DENIED (blocked by text length assertions).

### Payload 9: Hijack Interaction Logging
* **Target Path**: `/users/victim_uid/interactions/log_123`
* **Payload**: `{ "interactionId": "log_123", "command": "Hack security" }` written by anonymous user.
* **Attack Vector**: Write malicious interactions into other accounts without credentials.
* **Result**: PERMISSION_DENIED.

### Payload 10: Bypass Schema on Device Addition
* **Target Path**: `/users/victim_uid/devices/living_room_light`
* **Payload**: `{ "deviceId": "living_room_light", "name": "Living Room Light" }` (Missing `status`, `type`, `updatedAt`).
* **Attack Vector**: Adding broken entries that crash downstream visual state renders.
* **Result**: PERMISSION_DENIED.

### Payload 11: Reading Cross-Account Logs via List Query
* **Action**: List `users/victim_uid/interactions`
* **Query**: `query(collection(db, "users/victim_uid/interactions"))` run by `attacker_uid`.
* **Attack Vector**: Extracting confidential dialog logs.
* **Result**: PERMISSION_DENIED.

### Payload 12: Invalid SmartDevice Type Enums
* **Target Path**: `/users/victim_uid/devices/reactor`
* **Payload**: `{ "type": "super_weapon" }`
* **Attack Vector**: Injecting unrecognized smart device category variables.
* **Result**: PERMISSION_DENIED.

---

## 3. Security Test Specification
All operations in the test environment (e.g., using Firestore emulator or security rules testing suites) verifying the Dirty Dozen endpoints must throw standard authentication error exceptions. We guarantee that all data manipulations strictly enforce `isOwner()` boundaries.
