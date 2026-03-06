# Technical Requirement Document (TRD)

## Digital Documentation & Identity Verification System

**Version:** 1.0 (Hackathon MVP)
**Date:** March 6, 2026
**Author:** Architecture Team
**References:** PRD v1.0, Feature List v1.0

---

## 1. System Overview

### 1.1 High-Level Architecture

The system follows a **three-tier client-server architecture** with a decoupled frontend and backend communicating over REST APIs. All file assets are offloaded to cloud object storage, keeping the application server stateless and horizontally scalable.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │              React.js SPA (Tailwind CSS)                  │     │
│   │                                                           │     │
│   │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │     │
│   │  │  Auth   │ │ Document │ │Signature │ │   Admin     │  │     │
│   │  │  Pages  │ │  Views   │ │  Canvas  │ │  Dashboard  │  │     │
│   │  └─────────┘ └──────────┘ └──────────┘ └─────────────┘  │     │
│   └──────────────────────┬────────────────────────────────────┘     │
│                          │ HTTPS / REST API                         │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                     APPLICATION TIER                                 │
│                          │                                          │
│   ┌──────────────────────▼────────────────────────────────────┐     │
│   │            Node.js + Express.js API Server                │     │
│   │                                                           │     │
│   │  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐ │     │
│   │  │   Auth   │ │ Document  │ │  Signature │ │  Admin   │ │     │
│   │  │Middleware │ │  Service  │ │  Service   │ │ Service  │ │     │
│   │  └──────────┘ └───────────┘ └────────────┘ └──────────┘ │     │
│   │  ┌──────────┐ ┌───────────┐ ┌────────────┐              │     │
│   │  │   RBAC   │ │   PDF     │ │ Verification│             │     │
│   │  │  Guard   │ │ Generator │ │  Service   │              │     │
│   │  └──────────┘ └───────────┘ └────────────┘              │     │
│   └───────┬──────────────┬──────────────┬─────────────────────┘     │
│           │              │              │                            │
└───────────┼──────────────┼──────────────┼────────────────────────────┘
            │              │              │
┌───────────┼──────────────┼──────────────┼────────────────────────────┐
│           │         DATA TIER           │                            │
│   ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼───────┐                   │
│   │   MongoDB    │ │ AWS S3 / │ │  Nodemailer  │                   │
│   │  (Atlas)     │ │Cloudinary│ │  (Email)     │                   │
│   │              │ │          │ │              │                   │
│   │ - Users      │ │ - PDFs   │ │ - OTP Codes  │                   │
│   │ - Documents  │ │ - Images │ │ - Notifs     │                   │
│   │ - Templates  │ │ - IDs    │ │              │                   │
│   │ - Audit Logs │ │          │ │              │                   │
│   └──────────────┘ └──────────┘ └──────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 System Workflow & Component Interaction

The primary workflow follows this sequence through the system:

```
                    ADMIN FLOW                              USER FLOW
                    ──────────                              ─────────

            ┌──────────────────┐
            │ Admin logs in    │
            │ (JWT issued)     │
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │ Create/select    │
            │ template         │
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │ Fill placeholders│
            │ & assign to user │
            └────────┬─────────┘
                     │
                     │  Document status: SENT
                     │  ─────────────────────────────►  Email notification
                     │                                        │
                     │                              ┌─────────▼──────────┐
                     │                              │ User logs in       │
                     │                              │ (JWT issued)       │
                     │                              └─────────┬──────────┘
                     │                                        │
                     │  Document status: VIEWED     ┌─────────▼──────────┐
                     │  ◄───────────────────────────│ User views document│
                     │                              └─────────┬──────────┘
                     │                                        │
                     │                              ┌─────────▼──────────┐
                     │                              │ (P1) Verify ID     │
                     │                              │ Upload + OTP       │
                     │                              └─────────┬──────────┘
                     │                                        │
                     │  Document status: SIGNED     ┌─────────▼──────────┐
                     │  ◄───────────────────────────│ User signs document│
                     │                              │ (canvas signature) │
                     │                              └─────────┬──────────┘
                     │                                        │
            ┌────────▼─────────┐                    ┌─────────▼──────────┐
            │ Admin reviews on │                    │ User downloads     │
            │ dashboard        │                    │ signed PDF         │
            └────────┬─────────┘                    └────────────────────┘
                     │
            ┌────────▼─────────┐
            │ Download signed  │
            │ PDF for records  │
            └──────────────────┘

            ┌──────────────────────────────────────────────────────────┐
            │  AUDIT LOG: Every action above is logged with timestamp, │
            │  user ID, action type, and document ID                   │
            └──────────────────────────────────────────────────────────┘
```

### 1.3 Architectural Decisions

| Decision | Rationale |
|---|---|
| **Monolithic backend** | Single Express server is faster to build and deploy for a hackathon. Modular code structure allows future extraction into microservices |
| **MongoDB (NoSQL)** | Flexible schema suits documents with varying structures. No migrations needed — ideal for rapid iteration |
| **Stateless API + JWT** | No server-side sessions to manage. Simplifies horizontal scaling and deployment |
| **Cloud object storage** | Keeps the database lean. Files served directly via signed URLs — minimal server load |
| **React SPA** | Decoupled frontend enables independent deployment and faster UI iteration |

---

## 2. Technology Stack

### 2.1 Frontend

| Component | Technology | Purpose |
|---|---|---|
| **Framework** | React.js 18+ | Component-based SPA with hooks |
| **Styling** | Tailwind CSS 3+ | Utility-first CSS for rapid UI development |
| **Routing** | React Router v6 | Client-side navigation with protected routes |
| **HTTP Client** | Axios | API communication with interceptors for JWT refresh |
| **Signature** | signature_pad | HTML5 canvas-based signature capture |
| **PDF Viewer** | react-pdf | In-browser document preview before signing |
| **Charts** | Recharts (P1) | Admin dashboard analytics |
| **Forms** | React Hook Form + Zod | Form handling with schema validation |
| **State** | React Context API | Global auth state; local state for everything else |
| **Notifications** | React Hot Toast | In-app toast notifications |

### 2.2 Backend

| Component | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20 LTS | JavaScript runtime |
| **Framework** | Express.js 4 | REST API framework |
| **Auth** | jsonwebtoken + bcryptjs | JWT generation/validation + password hashing |
| **Validation** | Joi / Zod | Request payload validation |
| **PDF Generation** | pdf-lib | Create and modify PDFs programmatically |
| **File Upload** | Multer | Multipart form-data handling |
| **Email** | Nodemailer | Transactional email (notifications, OTP) |
| **OTP** | otp-generator (P1) | Time-based OTP generation |
| **Logging** | Winston | Structured application logging |
| **CORS** | cors | Cross-origin resource sharing configuration |
| **Rate Limiting** | express-rate-limit | API abuse protection |

### 2.3 Database

| Component | Technology | Purpose |
|---|---|---|
| **Primary Database** | MongoDB 7+ (Atlas) | User data, documents, templates, audit logs |
| **ODM** | Mongoose 8+ | Schema modeling, validation, and query building |

### 2.4 File Storage

| Component | Technology | Purpose |
|---|---|---|
| **Object Storage** | Cloudinary / AWS S3 | Encrypted storage for PDFs, images, and ID uploads |
| **Access Control** | Pre-signed URLs | Time-limited, secure access links for file downloads |

### 2.5 Third-Party Integrations

| Integration | Service | Usage | MVP Tier |
|---|---|---|---|
| **Email Delivery** | Nodemailer + Gmail SMTP / Mailtrap (dev) | OTP delivery, document notifications | P1 |
| **Cloud Storage** | Cloudinary free tier / AWS S3 | Document and image storage | P0 |
| **Deployment** | Vercel + Render | Frontend and backend hosting | P0 |
| **Monitoring** | Render built-in logs / Morgan | Request logging, error tracking | P0 |

---

## 3. Application Modules

### 3.1 Authentication Module

```
┌─────────────────────────────────────────────────────────┐
│                  AUTHENTICATION MODULE                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Controllers:                                           │
│  ├── authController.register()                          │
│  ├── authController.login()                             │
│  ├── authController.refreshToken()                      │
│  └── authController.logout()                            │
│                                                         │
│  Middleware:                                             │
│  ├── authMiddleware.verifyToken()    ── JWT validation   │
│  ├── authMiddleware.requireAdmin()   ── Role guard       │
│  └── authMiddleware.requireUser()    ── Role guard       │
│                                                         │
│  Model: User                                            │
│  ├── name, email, password (hashed)                     │
│  ├── role (admin | user)                                │
│  ├── isVerified, verificationStatus                     │
│  └── createdAt, updatedAt                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- User registration with input validation and duplicate detection
- Password hashing with bcrypt (salt rounds: 12)
- JWT access token (15 min expiry) + refresh token (7 day expiry)
- Role assignment at registration (default: `user`; first user or seeded: `admin`)
- Middleware guards for protected routes and role-based access

**Data Model — User:**

```javascript
{
  _id: ObjectId,
  name: String,               // required, 2-100 chars
  email: String,              // required, unique, lowercase
  password: String,           // required, bcrypt hashed
  role: String,               // enum: ["admin", "user"], default: "user"
  isVerified: Boolean,        // identity verification status, default: false
  verificationDocUrl: String, // cloud URL to uploaded ID (P1)
  refreshToken: String,       // stored hashed refresh token
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.2 Identity Verification Module (P1)

```
┌─────────────────────────────────────────────────────────┐
│              IDENTITY VERIFICATION MODULE (P1)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Controllers:                                           │
│  ├── verificationController.uploadId()                  │
│  ├── verificationController.sendOtp()                   │
│  ├── verificationController.verifyOtp()                 │
│  └── verificationController.getStatus()                 │
│                                                         │
│  Services:                                              │
│  ├── otpService.generate()    ── 6-digit OTP            │
│  ├── otpService.verify()      ── Compare + expiry check │
│  └── storageService.upload()  ── Upload ID to cloud     │
│                                                         │
│  Model: Verification                                    │
│  ├── userId, documentType, documentUrl                  │
│  ├── otp, otpExpiresAt                                  │
│  └── status (pending | verified | rejected)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- Accept government ID image upload (JPEG/PNG, max 5 MB)
- Store uploaded document in cloud storage with restricted access
- Generate 6-digit OTP with 10-minute expiry
- Send OTP via email (Nodemailer)
- Verify OTP and update user verification status
- Admin can review and manually approve/reject verification

**Data Model — Verification:**

```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // ref: User
  documentType: String,         // enum: ["aadhaar", "passport", "driving_license", "other"]
  documentUrl: String,          // cloud storage URL (encrypted path)
  otp: String,                  // hashed OTP
  otpExpiresAt: Date,           // OTP expiry timestamp
  status: String,               // enum: ["pending", "verified", "rejected"]
  reviewedBy: ObjectId,         // ref: User (admin who reviewed)
  reviewedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.3 Agreement & E-Signature Module

```
┌─────────────────────────────────────────────────────────┐
│            AGREEMENT & E-SIGNATURE MODULE                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Controllers:                                           │
│  ├── templateController.create()                        │
│  ├── templateController.update()                        │
│  ├── templateController.delete()                        │
│  ├── templateController.list()                          │
│  ├── documentController.generate()    ── From template  │
│  ├── documentController.assign()      ── To user        │
│  ├── documentController.getById()                       │
│  ├── documentController.listByUser()                    │
│  └── signatureController.sign()       ── E-sign + lock  │
│                                                         │
│  Services:                                              │
│  ├── templateService.fillPlaceholders()                 │
│  ├── pdfService.generatePdf()         ── pdf-lib        │
│  ├── pdfService.embedSignature()      ── Signature img  │
│  └── auditService.log()              ── Log action      │
│                                                         │
│  Models: Template, Document, Signature                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- CRUD operations on document templates (admin only)
- Placeholder parsing and substitution (`{{key}}` → value)
- PDF generation from filled templates using pdf-lib
- Document assignment to users with status tracking
- Signature capture (base64 image from canvas), embedding into PDF
- Document locking post-signature (immutable)
- Audit log entry for every state transition

**Data Model — Template:**

```javascript
{
  _id: ObjectId,
  title: String,                // "Offer Letter", "NDA"
  content: String,              // Template body with {{placeholders}}
  placeholders: [String],       // ["employee_name", "date", "designation"]
  createdBy: ObjectId,          // ref: User (admin)
  isActive: Boolean,            // soft delete / archive
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model — Document:**

```javascript
{
  _id: ObjectId,
  templateId: ObjectId,         // ref: Template
  title: String,                // Generated document title
  content: String,              // Filled content (placeholders resolved)
  pdfUrl: String,               // Cloud URL to generated PDF
  status: String,               // enum: ["draft","sent","viewed","signed","completed"]
  assignedTo: ObjectId,         // ref: User (signer)
  assignedBy: ObjectId,         // ref: User (admin)
  requiresVerification: Boolean,// Does this doc require ID verification?
  metadata: {
    filledValues: Object,       // { employee_name: "Rahul", date: "2026-03-06" }
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model — Signature:**

```javascript
{
  _id: ObjectId,
  documentId: ObjectId,         // ref: Document
  signedBy: ObjectId,           // ref: User
  signatureImageUrl: String,    // Cloud URL to signature image (base64 → PNG)
  signedPdfUrl: String,         // Cloud URL to final signed PDF
  ipAddress: String,            // Signer's IP for audit
  userAgent: String,            // Signer's browser for audit
  signedAt: Date,
  createdAt: Date
}
```

---

### 3.4 Document Storage & Management Module

```
┌─────────────────────────────────────────────────────────┐
│          DOCUMENT STORAGE & MANAGEMENT MODULE            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Controllers:                                           │
│  ├── storageController.upload()       ── Generic upload  │
│  ├── storageController.download()     ── Signed URL      │
│  ├── storageController.listByUser()   ── User's docs     │
│  └── storageController.delete()       ── Admin only      │
│                                                         │
│  Services:                                              │
│  ├── cloudService.upload()     ── S3/Cloudinary upload   │
│  ├── cloudService.getSignedUrl() ── Time-limited URL     │
│  ├── cloudService.delete()     ── Remove from storage    │
│  └── searchService.search()   ── Text search (P1)       │
│                                                         │
│  Model: AuditLog                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- Upload files to cloud storage with folder-based organization (`/documents/`, `/signatures/`, `/ids/`)
- Generate pre-signed download URLs with configurable expiry (default: 15 min)
- Enforce RBAC — users access own files, admins access all
- Document listing with filters: status, date range, assigned user
- Full-text search on document titles and metadata (P1, MongoDB text index)
- Immutable audit log for every file action

**Data Model — AuditLog:**

```javascript
{
  _id: ObjectId,
  action: String,               // enum: ["created","sent","viewed","signed","downloaded","deleted"]
  documentId: ObjectId,         // ref: Document
  performedBy: ObjectId,        // ref: User
  performedByRole: String,      // "admin" | "user"
  ipAddress: String,
  userAgent: String,
  details: String,              // Optional context ("Document assigned to user@email.com")
  timestamp: Date               // Indexed for fast retrieval
}
```

---

### 3.5 Admin Dashboard Module

```
┌─────────────────────────────────────────────────────────┐
│                 ADMIN DASHBOARD MODULE                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Controllers:                                           │
│  ├── dashboardController.getStats()       ── Counts      │
│  ├── dashboardController.getRecentActivity() ── Feed     │
│  ├── dashboardController.getDocuments()   ── Filtered    │
│  ├── dashboardController.getUsers()       ── User list   │
│  └── dashboardController.getAnalytics()   ── Charts (P1) │
│                                                         │
│  Aggregation Pipelines:                                 │
│  ├── countByStatus()          ── Docs per status         │
│  ├── countByDate()            ── Docs over time (P1)     │
│  ├── avgSigningTime()         ── Avg time to sign (P1)   │
│  └── verificationStats()     ── KYC status summary (P1)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Responsibilities:**
- Aggregate document counts by status (pending, signed, completed)
- List all documents with server-side filtering & pagination
- Recent activity feed from audit logs (last 50 entries)
- User management: list users, view verification status
- Analytics (P1): documents over time, average signing duration, completion rate

---

## 4. API Design

### Base URL

```
Development:  http://localhost:5000/api/v1
Production:   https://api.docverify.app/api/v1
```

### Common Response Format

```json
// Success
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [ { "field": "email", "message": "Email is required" } ]
}

// Paginated
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

### 4.1 Authentication APIs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user | Public |
| `POST` | `/auth/login` | Login, returns JWT access + refresh token | Public |
| `POST` | `/auth/refresh` | Refresh access token using refresh token | Public |
| `POST` | `/auth/logout` | Invalidate refresh token | User |
| `GET` | `/auth/me` | Get current user profile | User |

**POST `/auth/register`**

```json
// Request
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "SecurePass123!"
}

// Response 201
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**POST `/auth/login`**

```json
// Request
{
  "email": "rahul@example.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "Rahul Sharma", "role": "user" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### 4.2 Document Template APIs (Admin Only)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/templates` | Create a new template | Admin |
| `GET` | `/templates` | List all templates | Admin |
| `GET` | `/templates/:id` | Get template by ID | Admin |
| `PUT` | `/templates/:id` | Update template | Admin |
| `DELETE` | `/templates/:id` | Delete template (soft) | Admin |

**POST `/templates`**

```json
// Request
{
  "title": "Offer Letter",
  "content": "Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} at {{company_name}}, effective {{start_date}}.\n\nYour annual compensation will be {{salary}}.\n\nPlease sign below to accept this offer.\n\nSincerely,\n{{hr_name}}\nHR Manager",
  "placeholders": ["employee_name", "designation", "company_name", "start_date", "salary", "hr_name"]
}

// Response 201
{
  "success": true,
  "message": "Template created",
  "data": {
    "id": "...",
    "title": "Offer Letter",
    "placeholders": ["employee_name", "designation", "company_name", "start_date", "salary", "hr_name"],
    "createdAt": "2026-03-06T10:30:00Z"
  }
}
```

---

### 4.3 Agreement Generation & Document APIs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/documents/generate` | Generate document from template | Admin |
| `GET` | `/documents` | List documents (filtered by role) | User |
| `GET` | `/documents/:id` | Get document details | User |
| `PATCH` | `/documents/:id/status` | Update document status | System/Admin |
| `GET` | `/documents/:id/download` | Download document PDF | User |

**POST `/documents/generate`**

```json
// Request
{
  "templateId": "660e8400-...",
  "assignedTo": "770f9500-...",
  "title": "Offer Letter - Rahul Sharma",
  "values": {
    "employee_name": "Rahul Sharma",
    "designation": "Software Engineer",
    "company_name": "TechCorp Pvt Ltd",
    "start_date": "2026-04-01",
    "salary": "₹12,00,000",
    "hr_name": "Priya Patel"
  },
  "requiresVerification": false
}

// Response 201
{
  "success": true,
  "message": "Document generated and assigned",
  "data": {
    "id": "880a1234-...",
    "title": "Offer Letter - Rahul Sharma",
    "status": "sent",
    "assignedTo": { "id": "770f9500-...", "name": "Rahul Sharma" },
    "pdfUrl": "https://storage.../documents/880a1234.pdf",
    "createdAt": "2026-03-06T11:00:00Z"
  }
}
```

**GET `/documents?status=pending&page=1&limit=20`**

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "880a1234-...",
      "title": "Offer Letter - Rahul Sharma",
      "status": "sent",
      "assignedTo": { "id": "...", "name": "Rahul Sharma" },
      "createdAt": "2026-03-06T11:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

---

### 4.4 Signature Submission APIs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/documents/:id/sign` | Submit signature for a document | User |
| `GET` | `/documents/:id/signature` | Get signature details for a document | User |

**POST `/documents/:id/sign`**

```json
// Request (multipart/form-data OR JSON)
{
  "signatureImage": "data:image/png;base64,iVBORw0KGgo..."
}

// Response 200
{
  "success": true,
  "message": "Document signed successfully",
  "data": {
    "documentId": "880a1234-...",
    "status": "signed",
    "signedPdfUrl": "https://storage.../documents/880a1234-signed.pdf",
    "signedAt": "2026-03-06T12:30:00Z",
    "signedBy": { "id": "770f9500-...", "name": "Rahul Sharma" }
  }
}
```

---

### 4.5 Identity Verification APIs (P1)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/verification/upload-id` | Upload government ID image | User |
| `POST` | `/verification/send-otp` | Send OTP to user's email | User |
| `POST` | `/verification/verify-otp` | Verify OTP | User |
| `GET` | `/verification/status` | Get current user's verification status | User |
| `PATCH` | `/verification/:userId/review` | Admin approves/rejects verification | Admin |

**POST `/verification/upload-id`** (multipart/form-data)

```json
// Request: form-data with file field "idDocument" + "documentType"

// Response 200
{
  "success": true,
  "message": "ID document uploaded",
  "data": {
    "documentType": "aadhaar",
    "status": "pending",
    "uploadedAt": "2026-03-06T12:00:00Z"
  }
}
```

---

### 4.6 Admin Management APIs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/admin/dashboard/stats` | Get document and user summary stats | Admin |
| `GET` | `/admin/dashboard/activity` | Get recent activity log | Admin |
| `GET` | `/admin/users` | List all users with verification status | Admin |
| `PATCH` | `/admin/users/:id/role` | Update user role | Admin |
| `GET` | `/admin/analytics` | Get chart data (P1) | Admin |
| `GET` | `/admin/audit-logs` | Get audit trail with filters | Admin |

**GET `/admin/dashboard/stats`**

```json
// Response 200
{
  "success": true,
  "data": {
    "totalDocuments": 156,
    "byStatus": {
      "draft": 12,
      "sent": 24,
      "viewed": 8,
      "signed": 45,
      "completed": 67
    },
    "totalUsers": 89,
    "verifiedUsers": 62,
    "documentsThisMonth": 34
  }
}
```

---

### 4.7 Complete API Route Map

```
/api/v1
│
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /refresh
│   ├── POST   /logout
│   └── GET    /me
│
├── /templates                    [Admin only]
│   ├── POST   /
│   ├── GET    /
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /documents
│   ├── POST   /generate          [Admin only]
│   ├── GET    /                   [Role-scoped]
│   ├── GET    /:id                [Owner or Admin]
│   ├── PATCH  /:id/status         [System/Admin]
│   ├── GET    /:id/download       [Owner or Admin]
│   ├── POST   /:id/sign           [Assigned User]
│   └── GET    /:id/signature      [Owner or Admin]
│
├── /verification                 [P1]
│   ├── POST   /upload-id          [User]
│   ├── POST   /send-otp           [User]
│   ├── POST   /verify-otp         [User]
│   ├── GET    /status              [User]
│   └── PATCH  /:userId/review     [Admin]
│
└── /admin                        [Admin only]
    ├── GET    /dashboard/stats
    ├── GET    /dashboard/activity
    ├── GET    /users
    ├── PATCH  /users/:id/role
    ├── GET    /analytics           [P1]
    └── GET    /audit-logs
```

---

## 5. Authentication & Security

### 5.1 Authentication Mechanism

```
┌──────────┐      POST /auth/login       ┌──────────────┐
│  Client  │ ──────────────────────────► │   Server     │
│          │     { email, password }      │              │
│          │                              │  1. Validate │
│          │      200 OK                  │  2. bcrypt   │
│          │ ◄────────────────────────── │     compare  │
│          │  { accessToken,              │  3. Sign JWT │
│          │    refreshToken }            │              │
└──────┬───┘                              └──────────────┘
       │
       │  Subsequent requests:
       │  Authorization: Bearer <accessToken>
       │
       ▼
┌──────────────────────────────────────────────────┐
│  authMiddleware.verifyToken()                     │
│                                                  │
│  1. Extract token from Authorization header      │
│  2. jwt.verify(token, ACCESS_TOKEN_SECRET)       │
│  3. Attach decoded user to req.user              │
│  4. Call next() or return 401                    │
└──────────────────────────────────────────────────┘
```

| Parameter | Value |
|---|---|
| **Algorithm** | HS256 (HMAC SHA-256) |
| **Access Token Expiry** | 15 minutes |
| **Refresh Token Expiry** | 7 days |
| **Password Hashing** | bcrypt, 12 salt rounds |
| **Token Storage (Client)** | httpOnly cookie (preferred) or secure localStorage |
| **Refresh Flow** | Client calls `/auth/refresh` with refresh token before access token expires |

### 5.2 Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC MATRIX                               │
├────────────────────────────┬──────────────┬─────────────────────┤
│  Resource / Action         │    Admin     │       User          │
├────────────────────────────┼──────────────┼─────────────────────┤
│  Create template           │      ✅      │        ❌           │
│  Edit/delete template      │      ✅      │        ❌           │
│  Generate document         │      ✅      │        ❌           │
│  Assign document           │      ✅      │        ❌           │
│  View all documents        │      ✅      │        ❌           │
│  View own documents        │      ✅      │        ✅           │
│  Sign assigned document    │      ❌      │        ✅           │
│  Download own signed PDF   │      ✅      │        ✅           │
│  Upload ID for verification│      ❌      │        ✅           │
│  Review verification       │      ✅      │        ❌           │
│  View dashboard & stats    │      ✅      │        ❌           │
│  Manage users              │      ✅      │        ❌           │
│  View audit logs           │      ✅      │        ❌           │
└────────────────────────────┴──────────────┴─────────────────────┘
```

**Implementation:** Express middleware functions chained on routes:

```javascript
// Route-level RBAC
router.post('/templates', verifyToken, requireAdmin, templateController.create);
router.get('/documents', verifyToken, documentController.list); // Controller scopes by role
router.post('/documents/:id/sign', verifyToken, requireUser, requireAssigned, signatureController.sign);
```

### 5.3 Data Encryption Strategy

| Layer | Mechanism | Details |
|---|---|---|
| **In Transit** | TLS 1.2+ (HTTPS) | Enforced by deployment platform (Render/Vercel). All API calls over HTTPS |
| **At Rest (DB)** | MongoDB Atlas Encryption | Atlas encrypts all data at rest with AES-256 by default |
| **At Rest (Files)** | S3 SSE / Cloudinary | Server-side encryption enabled on storage bucket |
| **Passwords** | bcrypt (12 rounds) | One-way hash — never stored in plaintext |
| **OTP** | Hashed before storage | OTP compared via hash, not plaintext. Expires in 10 min |
| **JWT Secret** | Environment variable | Never hardcoded. Rotated per environment |
| **Signed URLs** | Time-limited (15 min) | Document download links expire; no permanent public URLs |

### 5.4 Secure Document Handling

```
┌─────────────────────── DOCUMENT LIFECYCLE SECURITY ──────────────────────┐
│                                                                          │
│  Upload                                                                  │
│  ├── Multer validates file type (PDF, PNG, JPG) and size (≤10 MB)       │
│  ├── File scanned for MIME type verification (not just extension)        │
│  └── Uploaded to cloud with private ACL (no public access)               │
│                                                                          │
│  Storage                                                                 │
│  ├── Files stored in per-user folders: /org/{orgId}/user/{userId}/      │
│  ├── Server-side encryption (AES-256) enabled on bucket                 │
│  └── No directory listing — files only accessible via signed URLs        │
│                                                                          │
│  Access                                                                  │
│  ├── API verifies JWT + role + ownership before generating download URL  │
│  ├── Pre-signed URL expires in 15 minutes                               │
│  └── IP and user-agent logged in audit trail                            │
│                                                                          │
│  Post-Signature                                                          │
│  ├── Original PDF + signature = new signed PDF                          │
│  ├── Signed PDF is immutable (no update/delete by any user)             │
│  └── Hash of signed PDF stored for integrity verification               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Input Validation & Sanitization:**

| Threat | Mitigation |
|---|---|
| SQL / NoSQL Injection | Mongoose parameterized queries; Joi/Zod schema validation on all inputs |
| XSS | React auto-escapes output; DOMPurify for any user-generated content rendered as HTML |
| CSRF | SameSite cookie attribute; CORS restricted to frontend origin |
| File Upload Attacks | MIME type validation, file size limit, no execution permissions on storage |
| Brute Force | express-rate-limit: 100 req/15 min per IP on auth routes |
| Unauthorized Access | JWT + RBAC middleware on every protected route; ownership checks at controller level |

---

## 6. Performance Requirements

### 6.1 Response Time Targets

| Operation | Target | Notes |
|---|---|---|
| Auth (login/register) | < 300 ms | bcrypt is intentionally slow (~250ms at 12 rounds) |
| List documents (paginated) | < 200 ms | MongoDB indexed queries with projection |
| Get single document | < 150 ms | Direct lookup by `_id` |
| Generate document from template | < 500 ms | Template fill + PDF generation |
| Sign document | < 800 ms | Signature embed + PDF re-generation + cloud upload |
| Upload file (≤10 MB) | < 3 seconds | Depends on network; cloud upload is the bottleneck |
| Download signed URL generation | < 100 ms | Pre-signed URL is computed, not a file transfer |
| Dashboard stats | < 400 ms | MongoDB aggregation pipeline with indexed fields |

### 6.2 File Upload Limits

| Constraint | Limit |
|---|---|
| Max file size (documents) | 10 MB |
| Max file size (ID images) | 5 MB |
| Max signature image size | 500 KB |
| Allowed file types (documents) | PDF |
| Allowed file types (ID upload) | JPEG, PNG |
| Allowed file types (signature) | PNG (base64 encoded from canvas) |
| Max request body size | 15 MB |

### 6.3 Scalability Considerations

```
         Hackathon MVP                         Production Scale
    ┌─────────────────────┐              ┌──────────────────────────┐
    │  Single Express     │              │  Load Balancer           │
    │  server on Render   │    ──────►   │  ├── Express Instance 1  │
    │                     │              │  ├── Express Instance 2  │
    │  MongoDB Atlas      │              │  └── Express Instance N  │
    │  (shared cluster)   │              │                          │
    │                     │              │  MongoDB Atlas (dedicated│
    │  Cloudinary         │              │  cluster with replicas)  │
    │  (free tier)        │              │                          │
    │                     │              │  S3 + CloudFront CDN     │
    │  ~50 concurrent     │              │                          │
    │  users              │              │  Redis (session cache)   │
    └─────────────────────┘              │                          │
                                         │  ~10K+ concurrent users  │
                                         └──────────────────────────┘
```

| Design Choice | Why It Scales |
|---|---|
| Stateless API (JWT) | Any server instance can handle any request — no sticky sessions |
| Cloud object storage | Files don't consume server disk; storage scales independently |
| MongoDB Atlas | Managed scaling, automatic sharding, read replicas |
| Pagination on all list endpoints | Constant memory usage regardless of data volume |
| Indexed queries | `status`, `assignedTo`, `createdAt` indexed for fast lookups |

---

## 7. Deployment Strategy

### 7.1 Development Environment Setup

```
Local Development Stack
─────────────────────────────────────────────────
  Prerequisites:
  ├── Node.js 20 LTS
  ├── npm 10+ or yarn
  ├── MongoDB (local via Docker OR MongoDB Atlas free tier)
  └── Git

  Project Structure:
  docverify/
  ├── client/                    # React frontend
  │   ├── public/
  │   ├── src/
  │   │   ├── components/        # Reusable UI components
  │   │   ├── pages/             # Route-level pages
  │   │   ├── services/          # API call functions (axios)
  │   │   ├── context/           # Auth context provider
  │   │   ├── hooks/             # Custom hooks
  │   │   ├── utils/             # Helpers, constants
  │   │   └── App.jsx            # Root with router
  │   ├── .env                   # VITE_API_URL
  │   └── package.json
  │
  ├── server/                    # Express backend
  │   ├── config/                # DB connection, env config
  │   ├── controllers/           # Route handlers
  │   ├── middleware/             # auth, rbac, error handler
  │   ├── models/                # Mongoose schemas
  │   ├── routes/                # Express route definitions
  │   ├── services/              # Business logic (pdf, cloud, otp)
  │   ├── utils/                 # Helpers (response formatter, logger)
  │   ├── .env                   # PORT, MONGO_URI, JWT_SECRET, etc.
  │   ├── server.js              # Entry point
  │   └── package.json
  │
  └── README.md
```

**Environment Variables (server/.env):**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/docverify

# JWT
ACCESS_TOKEN_SECRET=<random-256-bit-secret>
REFRESH_TOKEN_SECRET=<random-256-bit-secret>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Cloud Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app_password>

# Frontend URL (CORS)
CLIENT_URL=http://localhost:5173
```

**Quick Start Commands:**

```bash
# Clone and install
git clone <repo-url> && cd docverify

# Backend
cd server && npm install && npm run dev

# Frontend (new terminal)
cd client && npm install && npm run dev
```

### 7.2 Cloud Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                        │
│                                                                  │
│   ┌──────────────────┐         ┌──────────────────┐             │
│   │   Vercel          │         │   Render          │             │
│   │                  │         │                  │             │
│   │  React Frontend  │ ◄─────► │  Express Backend  │             │
│   │  (Static SPA)    │  API    │  (Web Service)    │             │
│   │                  │  Calls  │                  │             │
│   │  Auto-deploy     │         │  Auto-deploy     │             │
│   │  from /client    │         │  from /server    │             │
│   └──────────────────┘         └────────┬─────────┘             │
│                                         │                        │
│                              ┌──────────┼──────────┐            │
│                              │          │          │            │
│                        ┌─────▼───┐ ┌────▼────┐ ┌──▼──────┐    │
│                        │MongoDB  │ │Cloudinary│ │Mailtrap │    │
│                        │Atlas    │ │(Storage) │ │(Email)  │    │
│                        │Free M0  │ │Free tier │ │Free dev │    │
│                        └─────────┘ └─────────┘ └─────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Service | Platform | Tier | Why |
|---|---|---|---|
| **Frontend** | Vercel | Free | Zero-config React deployment, automatic HTTPS, preview deploys on every push |
| **Backend** | Render | Free | Supports Node.js web services, auto-deploy from Git, free TLS |
| **Database** | MongoDB Atlas | Free (M0) | 512 MB storage, enough for hackathon. Managed backups |
| **File Storage** | Cloudinary | Free | 25 credits/month, auto-optimization, signed URL support |
| **Email (Dev)** | Mailtrap | Free | Email sandbox for testing without sending real emails |
| **Email (Prod)** | Gmail SMTP | Free | App password based; works for low-volume sending |

### 7.3 CI/CD for Rapid Deployment

For a hackathon, Git-based auto-deploy is sufficient — no complex pipelines needed.

```
┌───────────┐     git push      ┌────────────────┐     auto-build     ┌──────────┐
│ Developer │ ──────────────► │    GitHub      │ ──────────────────► │ Vercel / │
│           │                  │    (main)      │                     │  Render  │
└───────────┘                  └────────────────┘                     └──────────┘
                                                                        │
                                                                   Live in ~60s
```

| Step | Configuration |
|---|---|
| **Vercel (Frontend)** | Connect GitHub repo → Set root directory to `client` → Set build command: `npm run build` → Auto-deploy on push to `main` |
| **Render (Backend)** | Connect GitHub repo → Set root directory to `server` → Set build command: `npm install` → Set start command: `node server.js` → Add environment variables → Auto-deploy on push to `main` |
| **Branch Strategy** | `main` = production. Developers push directly or via short-lived feature branches. No PR reviews required for hackathon speed |
| **Environment Separation** | Vercel/Render support environment variable overrides per branch. Use `development` env for preview deploys |

**Pre-deploy Checklist:**

```
☐ All .env variables set in Vercel/Render dashboard (never committed to git)
☐ CORS origin set to Vercel frontend URL in backend config
☐ MongoDB Atlas network access allows Render IP (or 0.0.0.0/0 for hackathon)
☐ Cloudinary credentials configured in Render environment
☐ Admin seed script ready (creates first admin user on deploy)
```

---

## 8. Database Schema Summary (ERD)

```
┌──────────────────┐       ┌──────────────────────┐
│      USER        │       │      TEMPLATE         │
├──────────────────┤       ├──────────────────────┤
│ _id              │       │ _id                  │
│ name             │       │ title                │
│ email (unique)   │       │ content              │
│ password (hash)  │       │ placeholders[]       │
│ role             │◄──┐   │ createdBy ──────────►│
│ isVerified       │   │   │ isActive             │
│ refreshToken     │   │   │ timestamps           │
│ timestamps       │   │   └──────────┬───────────┘
└──────┬───────────┘   │              │
       │               │              │ templateId
       │ userId        │              │
       │               │   ┌──────────▼───────────┐
┌──────▼───────────┐   │   │     DOCUMENT          │
│   VERIFICATION   │   │   ├──────────────────────┤
│   (P1)           │   │   │ _id                  │
├──────────────────┤   │   │ templateId           │
│ _id              │   │   │ title                │
│ userId           │   │   │ content (filled)     │
│ documentType     │   ├───│ assignedTo           │
│ documentUrl      │   ├───│ assignedBy           │
│ otp (hash)       │   │   │ pdfUrl               │
│ otpExpiresAt     │   │   │ status               │
│ status           │   │   │ requiresVerification │
│ reviewedBy       │   │   │ metadata             │
│ timestamps       │   │   │ timestamps           │
└──────────────────┘   │   └──────────┬───────────┘
                       │              │
                       │              │ documentId
                       │              │
                       │   ┌──────────▼───────────┐
                       │   │     SIGNATURE         │
                       │   ├──────────────────────┤
                       │   │ _id                  │
                       │   │ documentId           │
                       ├───│ signedBy             │
                       │   │ signatureImageUrl    │
                       │   │ signedPdfUrl         │
                       │   │ ipAddress            │
                       │   │ userAgent            │
                       │   │ signedAt             │
                       │   └──────────────────────┘
                       │
                       │   ┌──────────────────────┐
                       │   │     AUDIT LOG         │
                       │   ├──────────────────────┤
                       │   │ _id                  │
                       │   │ action               │
                       │   │ documentId           │
                       ├───│ performedBy          │
                           │ performedByRole      │
                           │ ipAddress            │
                           │ details              │
                           │ timestamp (indexed)  │
                           └──────────────────────┘
```

**MongoDB Indexes:**

```javascript
// User
{ email: 1 }                          // unique

// Document
{ assignedTo: 1, status: 1 }          // user's pending docs
{ assignedBy: 1, createdAt: -1 }      // admin's recent docs
{ status: 1 }                         // dashboard stats

// AuditLog
{ documentId: 1, timestamp: -1 }      // audit trail per doc
{ performedBy: 1, timestamp: -1 }     // user activity log
{ timestamp: -1 }                     // recent activity feed

// Verification (P1)
{ userId: 1 }                         // user's verification
```

---

## 9. Implementation Priority (Hackathon Sprint Plan)

```
Phase 1: Foundation (Hours 1–4)
├── Project scaffolding (client + server)
├── MongoDB connection + User model
├── Auth routes (register, login, JWT)
├── Auth middleware + RBAC guards
└── Basic React pages (login, register, layout)

Phase 2: Core Document Flow (Hours 5–10)
├── Template CRUD (model, routes, admin UI)
├── Document generation from template
├── Document listing (admin: all, user: own)
├── Document detail view with status
└── PDF generation with pdf-lib

Phase 3: E-Signature (Hours 11–14)
├── Signature canvas (signature_pad integration)
├── Signature capture → base64 → cloud upload
├── Embed signature into PDF
├── Document locking post-signature
└── Signed PDF download

Phase 4: Dashboard & Polish (Hours 15–18)
├── Admin dashboard with stats
├── Audit log entries for all actions
├── Document status filters
├── UI polish, error handling, loading states
└── Responsive design pass

Phase 5 (Stretch): Verification & Notifications (Hours 19+)
├── ID upload + cloud storage
├── OTP generation + email delivery
├── OTP verification flow
├── Email notifications (document assigned, signed)
└── Analytics charts on dashboard
```

---

*This TRD is designed for a hackathon MVP — simple enough to implement quickly, modular enough to extend post-hackathon. Every architectural choice prioritizes speed of development without sacrificing security fundamentals.*
