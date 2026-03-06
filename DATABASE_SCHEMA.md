# Database Schema Design

## Digital Documentation & Identity Verification System

| Field | Detail |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-03-06 |
| **Scope** | Hackathon MVP |
| **Database** | MongoDB 7+ (Atlas Free M0) |
| **ODM** | Mongoose 8+ |
| **File Storage** | Microsoft Azure Blob Storage |

---

## Table of Contents

1. [Database Type Recommendation](#1-database-type-recommendation)
2. [Database Entities / Collections](#2-database-entities--collections)
3. [Schema Design](#3-schema-design)
4. [Relationships Between Entities](#4-relationships-between-entities)
5. [Example Records](#5-example-records)
6. [Hackathon MVP Optimization](#6-hackathon-mvp-optimization)

---

## 1. Database Type Recommendation

### Recommendation: **NoSQL — MongoDB**

| Factor | Why MongoDB Wins |
|---|---|
| **Schema flexibility** | Document templates have variable placeholders and metadata — a rigid SQL schema would require constant migrations. MongoDB's flexible documents handle this natively. |
| **Rapid development** | No migrations, no ALTER TABLE. Add or remove fields by changing Mongoose schemas — ideal for hackathon velocity. |
| **JSON-native** | The entire stack (React → Express → MongoDB) thinks in JSON. No ORM impedance mismatch, no row-to-object mapping overhead. |
| **Nested data** | Document metadata (`filledValues`), template placeholders, and audit details fit naturally as embedded objects or arrays. |
| **Free hosting** | MongoDB Atlas M0 free tier: 512 MB storage, shared RAM, automatic backups — zero cost for MVP. |
| **Mongoose ODM** | Provides schema validation, type casting, middleware hooks, and `.populate()` for joins — gives us SQL-like structure when needed, without the rigidity. |
| **Scaling path** | Atlas handles replica sets, sharding, and read replicas if the project grows beyond hackathon. |

### Why Not SQL?

| SQL Drawback | Impact on This Project |
|---|---|
| Fixed schemas require migrations | Slows hackathon iteration speed |
| Joins across 6 tables for a single document view | Complex queries for document + template + signature + audit |
| Hosting cost | Free-tier PostgreSQL (Supabase/Neon) has lower limits than Atlas M0 |
| ORM overhead | Sequelize/Prisma adds complexity vs. Mongoose's simplicity |

> **Bottom line:** MongoDB gives us schema flexibility for prototype iteration, native JSON alignment with our MERN stack, and a generous free tier — all critical for a hackathon.

---

## 2. Database Entities / Collections

The MVP requires **6 collections**. Each maps to a core business domain:

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE: docverify                         │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │  users   │  │templates │  │documents │  │  signatures  │  │
│   │          │  │          │  │          │  │              │  │
│   │  P0 MVP  │  │  P0 MVP  │  │  P0 MVP  │  │   P0 MVP     │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐                           │
│   │verifications │  │  auditlogs   │                           │
│   │              │  │              │                           │
│   │   P1 Nice    │  │   P0 MVP     │                           │
│   └──────────────┘  └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| # | Collection | Priority | Purpose | Estimated Record Size |
|---|---|---|---|---|
| 1 | `users` | P0 | Admin and user accounts, authentication, roles | ~0.5 KB |
| 2 | `templates` | P0 | Reusable document templates with placeholders | ~2–5 KB |
| 3 | `documents` | P0 | Generated, filled documents with status tracking | ~3–8 KB |
| 4 | `signatures` | P0 | E-signature records linking user, document, and signed PDF | ~0.5 KB |
| 5 | `verifications` | P1 | Identity verification requests with OTP and document uploads | ~0.5 KB |
| 6 | `auditlogs` | P0 | Immutable activity log for every significant action | ~0.3 KB |

---

## 3. Schema Design

### 3.1 Users Collection

Stores admin and user accounts. Handles authentication, authorization, and profile state.

```javascript
// models/User.js
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      // bcrypt hashed — 12 salt rounds, never stored as plaintext
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
      // Flipped to true after identity verification (P1)
    },
    verificationDocUrl: {
      type: String,
      default: null,
      // Azure Blob Storage URL to uploaded ID document (P1)
    },
    refreshToken: {
      type: String,
      default: null,
      // Hashed refresh token for JWT rotation
    },
  },
  {
    timestamps: true, // auto-generates createdAt, updatedAt
  }
);
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | MongoDB auto-generated primary key |
| `name` | String | ✓ | — | Full name, 2–100 characters, trimmed |
| `email` | String | ✓ | — | Unique, lowercase, used as login identifier |
| `password` | String | ✓ | — | bcrypt hash (12 salt rounds), never plaintext |
| `role` | String | ✓ | `"user"` | `"admin"` or `"user"` — controls access across all routes |
| `isVerified` | Boolean | ✓ | `false` | Whether identity verification is complete (P1 feature) |
| `verificationDocUrl` | String | ✗ | `null` | Azure Blob URL to uploaded ID scan (P1 feature) |
| `refreshToken` | String | ✗ | `null` | Hashed JWT refresh token for token rotation |
| `createdAt` | Date | Auto | `Date.now` | Mongoose timestamp |
| `updatedAt` | Date | Auto | `Date.now` | Mongoose timestamp |

**Indexes:**

```javascript
userSchema.index({ email: 1 }, { unique: true });
// Covers: login lookup, duplicate prevention, user search
```

**Validation Rules:**
- `email` — Must match RFC 5322 email format (validated via Zod at API layer)
- `password` — Minimum 8 characters before hashing (validated at API layer, stored hashed)
- `role` — Strict enum, cannot be set to `"admin"` via public registration endpoint

---

### 3.2 Templates Collection

Stores reusable document blueprints. Only admins can create, edit, or deactivate templates.

```javascript
// models/Template.js
const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      // e.g., "Offer Letter", "NDA", "Rental Agreement"
    },
    content: {
      type: String,
      required: true,
      // Template body with {{placeholders}}
      // e.g., "Dear {{employee_name}}, your designation is {{designation}}..."
    },
    placeholders: {
      type: [String],
      required: true,
      // Extracted from content via regex: /\{\{(\w+)\}\}/g
      // e.g., ["employee_name", "designation", "start_date", "salary"]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Admin who created this template
    },
    isActive: {
      type: Boolean,
      default: true,
      // Soft delete — deactivated templates are hidden, not deleted
    },
  },
  {
    timestamps: true,
  }
);
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `title` | String | ✓ | — | Human-readable template name |
| `content` | String | ✓ | — | Full template body with `{{placeholder}}` tokens |
| `placeholders` | [String] | ✓ | — | Array of placeholder names extracted from `content` |
| `createdBy` | ObjectId | ✓ | — | Ref → `users` collection (admin who created) |
| `isActive` | Boolean | ✓ | `true` | Soft delete flag — `false` hides from template list |
| `createdAt` | Date | Auto | `Date.now` | Mongoose timestamp |
| `updatedAt` | Date | Auto | `Date.now` | Mongoose timestamp |

**Indexes:**

```javascript
// No custom indexes needed for MVP
// Queries by createdBy are infrequent (admin-only, small dataset)
// If template count grows: templateSchema.index({ createdBy: 1, isActive: 1 })
```

**Business Rules:**
- Placeholders array is auto-derived from `content` using regex `/\{\{(\w+)\}\}/g` during creation
- Deactivated templates (`isActive: false`) cannot be used to generate new documents
- Template `content` and `placeholders` are editable only while no signed documents reference it (enforced in service layer)

---

### 3.3 Documents Collection

The core entity. Represents a filled document generated from a template, assigned to a user for signing.

```javascript
// models/Document.js
const documentSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    title: {
      type: String,
      required: true,
      // e.g., "Offer Letter — Rahul Sharma"
    },
    content: {
      type: String,
      required: true,
      // Fully filled content — all {{placeholders}} replaced with values
    },
    pdfUrl: {
      type: String,
      required: true,
      // Azure Blob Storage URL to generated PDF
      // Immutable after status reaches "signed"
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "completed"],
      default: "draft",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // The user who must view and sign this document
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // The admin who generated and assigned this document
    },
    requiresVerification: {
      type: Boolean,
      default: false,
      // If true, user must complete identity verification before signing (P1)
    },
    metadata: {
      filledValues: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        // Key-value pairs: { employee_name: "Rahul", salary: "₹12,00,000" }
      },
    },
  },
  {
    timestamps: true,
  }
);
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `templateId` | ObjectId | ✓ | — | Ref → `templates` (source template) |
| `title` | String | ✓ | — | Human-readable title, typically "Template — Recipient Name" |
| `content` | String | ✓ | — | Final content with all placeholders filled |
| `pdfUrl` | String | ✓ | — | Azure Blob URL to generated PDF, immutable post-signing |
| `status` | String | ✓ | `"draft"` | State machine: `draft → sent → viewed → signed → completed` |
| `assignedTo` | ObjectId | ✓ | — | Ref → `users` (recipient / signer) |
| `assignedBy` | ObjectId | ✓ | — | Ref → `users` (issuing admin) |
| `requiresVerification` | Boolean | ✓ | `false` | Whether ID verification is needed before signing (P1) |
| `metadata.filledValues` | Mixed | ✓ | `{}` | Placeholder values used to fill this document |
| `createdAt` | Date | Auto | `Date.now` | Mongoose timestamp |
| `updatedAt` | Date | Auto | `Date.now` | Mongoose timestamp |

**Indexes:**

```javascript
documentSchema.index({ assignedTo: 1, status: 1 });
// Covers: "Show me my pending documents" — the most common user query

documentSchema.index({ assignedBy: 1, createdAt: -1 });
// Covers: "Show admin's recently created documents" — admin dashboard

documentSchema.index({ status: 1 });
// Covers: Dashboard stats aggregation — count by status
```

**Status State Machine:**

```
                    ┌─────────────────────────────────────────┐
                    │         DOCUMENT STATUS FLOW            │
                    │                                         │
                    │   ┌───────┐     Admin creates doc       │
                    │   │ draft │◄─── and fills placeholders  │
                    │   └───┬───┘                             │
                    │       │                                 │
                    │       │  Admin assigns to user          │
                    │       │  (email notification sent)      │
                    │       ▼                                 │
                    │   ┌───────┐                             │
                    │   │ sent  │                             │
                    │   └───┬───┘                             │
                    │       │                                 │
                    │       │  User opens the document        │
                    │       ▼                                 │
                    │   ┌────────┐                            │
                    │   │ viewed │                            │
                    │   └───┬────┘                            │
                    │       │                                 │
                    │       │  User draws & submits signature │
                    │       ▼                                 │
                    │   ┌────────┐                            │
                    │   │ signed │                            │
                    │   └───┬────┘                            │
                    │       │                                 │
                    │       │  Admin marks complete           │
                    │       │  (or auto-complete)             │
                    │       ▼                                 │
                    │   ┌───────────┐                         │
                    │   │ completed │                         │
                    │   └───────────┘                         │
                    │                                         │
                    └─────────────────────────────────────────┘
```

**Allowed Transitions (enforced in service layer):**

| From | To | Trigger |
|---|---|---|
| `draft` | `sent` | Admin assigns document to a user |
| `sent` | `viewed` | User opens the document for the first time |
| `viewed` | `signed` | User submits their e-signature |
| `signed` | `completed` | Admin marks as complete or auto-triggers after verification |

> Invalid transitions (e.g., `draft → signed`, `completed → sent`) are rejected by the service layer.

---

### 3.4 Signatures Collection

Records each e-signature event. One signature per document. Captures forensic metadata for legal audit.

```javascript
// models/Signature.js
const signatureSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    signatureImageUrl: {
      type: String,
      required: true,
      // Azure Blob URL to signature image (PNG from canvas via signature_pad)
    },
    signedPdfUrl: {
      type: String,
      required: true,
      // Azure Blob URL to final PDF with embedded signature
    },
    ipAddress: {
      type: String,
      required: true,
      // Signer's IP captured from req.ip — audit trail
    },
    userAgent: {
      type: String,
      required: true,
      // Signer's browser/device from req.headers['user-agent'] — audit trail
    },
    signedAt: {
      type: Date,
      required: true,
      default: Date.now,
      // Server-side timestamp — never trust client clock
    },
  },
  {
    timestamps: true,
  }
);
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `documentId` | ObjectId | ✓ | — | Ref → `documents` (the signed document) |
| `signedBy` | ObjectId | ✓ | — | Ref → `users` (who signed) |
| `signatureImageUrl` | String | ✓ | — | Azure Blob URL to PNG signature image |
| `signedPdfUrl` | String | ✓ | — | Azure Blob URL to final signed PDF |
| `ipAddress` | String | ✓ | — | Client IP at time of signing |
| `userAgent` | String | ✓ | — | Browser/device info at time of signing |
| `signedAt` | Date | ✓ | `Date.now` | Server-generated signing timestamp |
| `createdAt` | Date | Auto | `Date.now` | Mongoose timestamp |

**Indexes:**

```javascript
signatureSchema.index({ documentId: 1 }, { unique: true });
// Enforces: exactly one signature per document at database level
```

**Constraints:**
- **One signature per document** — Enforced by unique index on `documentId`
- **Immutable after creation** — `signatureImageUrl`, `signedPdfUrl`, `ipAddress`, `signedAt` are never updated
- **Authorization** — Only the user referenced in `document.assignedTo` can create a signature for that document
- **Prerequisite** — Document `status` must be `"viewed"` before a signature can be created

---

### 3.5 Verifications Collection (P1)

Handles identity verification flow: user uploads ID document, receives OTP via email, and confirms.

```javascript
// models/Verification.js
const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["aadhaar", "passport", "driving_license", "other"],
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
      // Azure Blob URL to uploaded ID image — accessed only via SAS URL
    },
    otp: {
      type: String,
      required: true,
      // HASHED — never stored as plaintext
      // Hashed via bcrypt before saving, compared via bcrypt.compare()
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      // Set to Date.now() + 10 minutes at creation
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // Admin who reviewed (if manual review is enabled)
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `userId` | ObjectId | ✓ | — | Ref → `users` (who is being verified) |
| `documentType` | String | ✓ | — | Type of ID: `aadhaar`, `passport`, `driving_license`, `other` |
| `documentUrl` | String | ✓ | — | Azure Blob URL to uploaded ID image |
| `otp` | String | ✓ | — | bcrypt-hashed OTP — **never stored in plaintext** |
| `otpExpiresAt` | Date | ✓ | — | Expiry timestamp (10 min after generation) |
| `status` | String | ✓ | `"pending"` | `pending → verified` or `pending → rejected` |
| `reviewedBy` | ObjectId | ✗ | `null` | Ref → `users` (admin reviewer, if applicable) |
| `reviewedAt` | Date | ✗ | `null` | When admin reviewed |
| `createdAt` | Date | Auto | `Date.now` | Mongoose timestamp |
| `updatedAt` | Date | Auto | `Date.now` | Mongoose timestamp |

**Indexes:**

```javascript
verificationSchema.index({ userId: 1 });
// Covers: "Is this user verified?" — checked before signing
```

**Security Notes:**
- OTP is hashed with bcrypt before saving — verified via `bcrypt.compare(inputOtp, stored.otp)`
- `documentUrl` is never exposed directly; API returns a time-limited SAS URL from Azure Blob Storage
- Expired OTPs (`otpExpiresAt < Date.now()`) are rejected at the service layer

---

### 3.6 AuditLogs Collection

Immutable, append-only log of every significant system action. Critical for compliance and debugging.

```javascript
// models/AuditLog.js
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      "created",
      "sent",
      "viewed",
      "signed",
      "downloaded",
      "deleted",
      "verified",
    ],
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    default: null,
    // Nullable — some actions (e.g., user verification) aren't document-specific
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  performedByRole: {
    type: String,
    enum: ["admin", "user"],
    required: true,
    // Snapshot of role at time of action — doesn't change if user role changes later
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    default: null,
    // Optional context: "Document assigned to rahul@example.com"
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    // Server-side only — never accept client timestamps
  },
});
```

**Field Reference:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `action` | String | ✓ | — | What happened: `created`, `sent`, `viewed`, `signed`, `downloaded`, `deleted`, `verified` |
| `documentId` | ObjectId | ✗ | `null` | Ref → `documents` (nullable for non-document actions) |
| `performedBy` | ObjectId | ✓ | — | Ref → `users` (who did it) |
| `performedByRole` | String | ✓ | — | Role snapshot: `"admin"` or `"user"` at time of action |
| `ipAddress` | String | ✓ | — | Client IP from `req.ip` |
| `userAgent` | String | ✓ | — | Browser/device from `req.headers['user-agent']` |
| `details` | String | ✗ | `null` | Optional human-readable context |
| `timestamp` | Date | ✓ | `Date.now` | When the action occurred (server-generated) |

**Indexes:**

```javascript
auditLogSchema.index({ documentId: 1, timestamp: -1 });
// Covers: "Show audit trail for document X" — ordered by most recent

auditLogSchema.index({ performedBy: 1, timestamp: -1 });
// Covers: "Show all actions by user Y" — admin investigation

auditLogSchema.index({ timestamp: -1 });
// Covers: "Show recent system activity" — admin dashboard feed
```

**Design Rules:**
- **Append-only** — No update or delete operations. `updatedAt` is intentionally excluded (no `timestamps: true`).
- **Role snapshot** — `performedByRole` captures the role at action time, not current role
- **Server timestamps** — `timestamp` is always `Date.now` server-side, never from request body

---

## 4. Relationships Between Entities

### 4.1 Relationship Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENTITY RELATIONSHIPS                          │
│                                                                      │
│                          ┌──────────┐                                │
│                ┌─────────│   USER   │──────────┐                     │
│                │         └──┬───┬───┘          │                     │
│                │            │   │              │                     │
│          createdBy     assignedTo assignedBy  userId                │
│            (1:N)       (1:N)  │  (1:N)      (1:N)                   │
│                │            │   │              │                     │
│         ┌──────▼───┐   ┌────▼───▼──┐   ┌──────▼────────┐           │
│         │ TEMPLATE │   │ DOCUMENT  │   │ VERIFICATION  │           │
│         └──────┬───┘   └──┬────┬───┘   └───────────────┘           │
│                │          │    │                                     │
│          templateId  documentId documentId                          │
│            (1:N)      (1:1)    (1:N)                                │
│                │          │    │                                     │
│                │   ┌──────▼──┐ │                                    │
│                │   │SIGNATURE│ │                                    │
│                │   └─────────┘ │                                    │
│                │          ┌────▼─────┐                               │
│                │          │ AUDITLOG │                               │
│                │          └──────────┘                               │
│                │                                                     │
│                └────── templateId (1:N) ──── DOCUMENT                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Relationship Details

| Relationship | Type | From → To | Foreign Key | Description |
|---|---|---|---|---|
| User creates Templates | **One-to-Many** | `User` → `Template` | `template.createdBy` | One admin creates many templates |
| User is assigned Documents | **One-to-Many** | `User` → `Document` | `document.assignedTo` | One user receives many documents to sign |
| User assigns Documents | **One-to-Many** | `User` → `Document` | `document.assignedBy` | One admin assigns many documents |
| Template generates Documents | **One-to-Many** | `Template` → `Document` | `document.templateId` | One template can produce many filled documents |
| User signs Documents | **One-to-Many** | `User` → `Signature` | `signature.signedBy` | One user can sign many documents (one at a time) |
| Document has Signature | **One-to-One** | `Document` → `Signature` | `signature.documentId` | Each document has exactly one signature (unique index) |
| Document has AuditLogs | **One-to-Many** | `Document` → `AuditLog` | `auditlog.documentId` | Each document generates multiple audit entries |
| User generates AuditLogs | **One-to-Many** | `User` → `AuditLog` | `auditlog.performedBy` | Each user action creates an audit entry |
| User has Verifications | **One-to-Many** | `User` → `Verification` | `verification.userId` | One user may have multiple verification attempts |
| User reviews Verifications | **One-to-Many** | `User` → `Verification` | `verification.reviewedBy` | One admin reviews many verifications |

### 4.3 How Joins Work (Mongoose `.populate()`)

MongoDB doesn't have native JOINs. We use Mongoose `populate()` to resolve references:

```javascript
// Get a document with all related data
const doc = await Document.findById(docId)
  .populate("templateId", "title placeholders")     // Template name
  .populate("assignedTo", "name email")              // Recipient info
  .populate("assignedBy", "name email");             // Admin info

// Get a signature with document and user
const sig = await Signature.findOne({ documentId: docId })
  .populate("signedBy", "name email");

// Get audit trail for a document
const logs = await AuditLog.find({ documentId: docId })
  .populate("performedBy", "name email role")
  .sort({ timestamp: -1 });
```

### 4.4 Why No Many-to-Many?

The MVP intentionally avoids many-to-many relationships:

| Scenario | Design Decision | Reason |
|---|---|---|
| One document, multiple signers | **Not in MVP** — 1 document = 1 signer | Multi-sign adds workflow complexity |
| One user, multiple roles | **Not in MVP** — 1 user = 1 role (`admin` or `user`) | Role per user is sufficient for hackathon |
| Templates shared across admins | All admins see all templates | No ownership matrix needed |

> If multi-signer support is needed post-hackathon, `document.assignedTo` would become an array of `{ userId, status, signedAt }` objects — no join table needed in MongoDB.

---

## 5. Example Records

### 5.1 User (Admin)

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c01",
  "name": "Priya Patel",
  "email": "priya@company.com",
  "password": "$2b$12$LJ3m5K8z9X7w6Y5v4U3t2eR1qP0oN9mL8kJ7hG6fD5sA4zX3wV2u",
  "role": "admin",
  "isVerified": true,
  "verificationDocUrl": null,
  "refreshToken": "$2b$12$aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9i",
  "createdAt": "2026-03-01T09:00:00.000Z",
  "updatedAt": "2026-03-06T14:30:00.000Z"
}
```

### 5.2 User (Regular)

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c02",
  "name": "Rahul Sharma",
  "email": "rahul@email.com",
  "password": "$2b$12$xY9wV8uT7sR6qP5oN4mL3kJ2hG1fD0eC9bA8zX7wV6uT5sR4qP3o",
  "role": "user",
  "isVerified": false,
  "verificationDocUrl": null,
  "refreshToken": null,
  "createdAt": "2026-03-03T11:20:00.000Z",
  "updatedAt": "2026-03-03T11:20:00.000Z"
}
```

### 5.3 Template

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c10",
  "title": "Offer Letter",
  "content": "Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} at {{company_name}}.\n\nYour annual compensation will be {{salary}}.\n\nStart date: {{start_date}}\n\nPlease sign this letter to confirm your acceptance.\n\nBest regards,\n{{issuer_name}}\nHR Department",
  "placeholders": [
    "employee_name",
    "designation",
    "company_name",
    "salary",
    "start_date",
    "issuer_name"
  ],
  "createdBy": "665f1a2b3c4d5e6f7a8b9c01",
  "isActive": true,
  "createdAt": "2026-03-02T10:00:00.000Z",
  "updatedAt": "2026-03-02T10:00:00.000Z"
}
```

### 5.4 Document

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c20",
  "templateId": "665f1a2b3c4d5e6f7a8b9c10",
  "title": "Offer Letter — Rahul Sharma",
  "content": "Dear Rahul Sharma,\n\nWe are pleased to offer you the position of Software Engineer at TechCorp India.\n\nYour annual compensation will be ₹12,00,000.\n\nStart date: 2026-04-01\n\nPlease sign this letter to confirm your acceptance.\n\nBest regards,\nPriya Patel\nHR Department",
  "pdfUrl": "https://docverify.blob.core.windows.net/documents/665f1a2b_offer-letter_rahul.pdf",
  "status": "viewed",
  "assignedTo": "665f1a2b3c4d5e6f7a8b9c02",
  "assignedBy": "665f1a2b3c4d5e6f7a8b9c01",
  "requiresVerification": true,
  "metadata": {
    "filledValues": {
      "employee_name": "Rahul Sharma",
      "designation": "Software Engineer",
      "company_name": "TechCorp India",
      "salary": "₹12,00,000",
      "start_date": "2026-04-01",
      "issuer_name": "Priya Patel"
    }
  },
  "createdAt": "2026-03-05T14:00:00.000Z",
  "updatedAt": "2026-03-06T09:15:00.000Z"
}
```

### 5.5 Signature

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c30",
  "documentId": "665f1a2b3c4d5e6f7a8b9c20",
  "signedBy": "665f1a2b3c4d5e6f7a8b9c02",
  "signatureImageUrl": "https://docverify.blob.core.windows.net/signatures/665f1a2b_rahul_sig.png",
  "signedPdfUrl": "https://docverify.blob.core.windows.net/documents/665f1a2b_offer-letter_rahul_signed.pdf",
  "ipAddress": "103.21.244.15",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0",
  "signedAt": "2026-03-06T10:30:00.000Z",
  "createdAt": "2026-03-06T10:30:00.000Z"
}
```

### 5.6 Verification (P1)

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c40",
  "userId": "665f1a2b3c4d5e6f7a8b9c02",
  "documentType": "aadhaar",
  "documentUrl": "https://docverify.blob.core.windows.net/ids/665f1a2b_rahul_aadhaar.jpg",
  "otp": "$2b$12$hG6fD5sA4zX3wV2uLJ3m5K8z9X7w6Y5v4U3t2eR1qP0oN9mL8kJ7",
  "otpExpiresAt": "2026-03-06T10:10:00.000Z",
  "status": "verified",
  "reviewedBy": null,
  "reviewedAt": null,
  "createdAt": "2026-03-06T10:00:00.000Z",
  "updatedAt": "2026-03-06T10:05:00.000Z"
}
```

### 5.7 AuditLog

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c50",
  "action": "signed",
  "documentId": "665f1a2b3c4d5e6f7a8b9c20",
  "performedBy": "665f1a2b3c4d5e6f7a8b9c02",
  "performedByRole": "user",
  "ipAddress": "103.21.244.15",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0",
  "details": "Document 'Offer Letter — Rahul Sharma' signed by rahul@email.com",
  "timestamp": "2026-03-06T10:30:00.000Z"
}
```

### 5.8 Complete Flow — How Records Connect

```
 ADMIN (Priya)                    SYSTEM                         USER (Rahul)
 ─────────────                    ──────                         ────────────

 1. Creates Template
    └─► Template._id = ...9c10
        Template.createdBy = ...9c01 (Priya)

 2. Fills template → generates Document
    └─► Document._id = ...9c20
        Document.templateId = ...9c10
        Document.assignedTo = ...9c02 (Rahul)
        Document.assignedBy = ...9c01 (Priya)
        Document.status = "draft"

 3. Assigns to Rahul
    └─► Document.status = "sent"
        AuditLog { action: "sent", documentId: ...9c20, performedBy: ...9c01 }
        Email sent to rahul@email.com

                                                         4. Rahul opens document
                                                            └─► Document.status = "viewed"
                                                                AuditLog { action: "viewed" }

                                                         5. Rahul draws signature & submits
                                                            └─► Signature._id = ...9c30
                                                                Signature.documentId = ...9c20
                                                                Signature.signedBy = ...9c02
                                                                Document.status = "signed"
                                                                AuditLog { action: "signed" }

 6. Priya marks complete
    └─► Document.status = "completed"
        AuditLog { action: "completed" }
```

---

## 6. Hackathon MVP Optimization

### 6.1 Simplifications Made

| Area | Full Production Design | MVP Simplification | Why |
|---|---|---|---|
| **Multi-signer** | `assignedTo: [{ userId, status, signedAt }]` | `assignedTo: ObjectId` (single signer) | Multi-party signing requires complex workflow orchestration |
| **Role system** | RBAC with permissions table, groups, hierarchies | Simple `role: "admin" \| "user"` enum field | Two roles cover all hackathon demo scenarios |
| **Template versioning** | Version history, diff tracking, rollback | No versioning — latest version only | Template edits are rare in MVP scope |
| **Document revisions** | Revision chain, amendment support | Single document record, immutable after signing | Keeps status flow linear and simple |
| **File storage references** | Asset management table with metadata, thumbnails, CDN variants | Direct URL strings on parent documents | No need for a separate files/assets collection |
| **Soft delete** | `deletedAt` field + global query filter on every collection | `isActive` on Templates only; other collections use hard delete | Audit logs provide history; soft delete everywhere adds query complexity |
| **Search** | Full-text search indexes, Atlas Search, autocomplete | Simple `title` regex match | Works for demo dataset sizes (<1000 docs) |
| **Pagination** | Cursor-based pagination with `lastId` | Skip/limit offset pagination | Simpler to implement; acceptable for small datasets |
| **Caching** | Redis layer for session, frequently accessed templates | No cache layer | MongoDB handles <100 concurrent users without cache |
| **Notifications** | Notification collection + WebSocket real-time delivery | Direct email via Nodemailer (P1) | Email is sufficient for async document notifications |
| **Encryption** | Application-level field encryption for PII | MongoDB Atlas at-rest + bcrypt for passwords/OTPs | Atlas encrypts by default; app-level encryption is future work |

### 6.2 What We Skipped Entirely

| Skipped Feature | Reason |
|---|---|
| **Separate Permissions table** | Two roles (`admin`/`user`) don't need a permissions matrix |
| **Sessions collection** | Stateless JWT — no server-side session storage needed |
| **Files/Assets collection** | URLs stored directly on Documents, Signatures, Verifications |
| **Notification queue** | No real-time notifications in MVP — email only (P1) |
| **Rate limiting persistence** | `express-rate-limit` uses in-memory store — no DB needed for MVP |
| **User preferences** | No settings page in MVP — hardcoded defaults |
| **Tags / Categories for documents** | Status-based filtering is sufficient for MVP |

### 6.3 Quick Deployment Checklist

```
 ✓ MongoDB Atlas M0 free cluster (512 MB, 3 nodes)
 ✓ Single database: "docverify"
 ✓ 6 collections — auto-created on first write by Mongoose
 ✓ Indexes applied via Mongoose schema definitions (auto-created on startup)
 ✓ Seed script for demo: 1 admin + 2 users + 3 templates
 ✓ No migrations needed — Mongoose handles schema evolution
 ✓ Environment variables: MONGO_URI + JWT secrets + Azure config
```

### 6.4 Seed Data for Demo

```javascript
// scripts/seed.js — run once before demo
const seedData = {
  users: [
    { name: "Admin Demo", email: "admin@demo.com", password: "Admin@123", role: "admin" },
    { name: "Rahul Sharma", email: "rahul@demo.com", password: "User@123", role: "user" },
    { name: "Ananya Singh", email: "ananya@demo.com", password: "User@123", role: "user" },
  ],
  templates: [
    { title: "Offer Letter", content: "Dear {{name}}, ... position of {{role}} ...", placeholders: ["name", "role", "salary", "date"] },
    { title: "NDA Agreement", content: "This NDA is between {{party_a}} and {{party_b}} ...", placeholders: ["party_a", "party_b", "effective_date"] },
    { title: "Rental Agreement", content: "This agreement between landlord {{landlord}} and tenant {{tenant}} ...", placeholders: ["landlord", "tenant", "address", "rent", "duration"] },
  ],
};
```

### 6.5 Post-Hackathon Scaling Path

```
 MVP (Now)                    V2 (Post-Hackathon)              Production
 ─────────                    ──────────────────               ──────────
 6 collections                + Notifications collection       + Elasticsearch
 Skip/limit pagination        + Cursor-based pagination        + Redis cache
 Single signer                + Multi-signer workflow          + Webhook events
 2 roles                      + Role permissions matrix        + SSO / OAuth
 In-memory rate limit         + Redis rate limiting            + API gateway
 Title regex search           + Atlas full-text search         + Autocomplete
 No versioning                + Template version history       + Diff viewer
 Direct URL strings           + Assets collection + CDN        + Thumbnail generation
```

---

> **Schema complete.** 6 collections, 52 total fields, 8 indexes, 10 relationships — minimal, practical, and ready to build.
