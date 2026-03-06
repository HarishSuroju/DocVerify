# User Flows & Interaction Design

## Digital Documentation & Identity Verification System

| Field | Detail |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-03-06 |
| **Scope** | Hackathon MVP |
| **Design Principles** | Minimal clicks, progressive disclosure, clear feedback at every step |

---

## Table of Contents

1. [New User Registration Flow](#1-new-user-registration-flow)
2. [Identity Verification Flow](#2-identity-verification-flow)
3. [Main Feature Flow — Agreement & E-Signature](#3-main-feature-flow--agreement--e-signature)
4. [Admin Workflow](#4-admin-workflow)
5. [Completing the Platform Goal — Full Document Lifecycle](#5-completing-the-platform-goal--full-document-lifecycle)
6. [Flow Diagrams](#6-flow-diagrams)

---

## 1. New User Registration Flow

### 1.1 Overview

The registration flow takes a first-time visitor from the landing page to a fully authenticated dashboard session in **4 screens and under 60 seconds**. The system creates a JWT session immediately after registration — no email confirmation required for MVP.

### 1.2 Step-by-Step Interaction Path

```
Step  Screen                 User Action                          System Response
────  ─────────────────────  ───────────────────────────────────  ──────────────────────────────────────
 1    Landing Page (/)       Clicks "Get Started" or "Sign Up"    Navigates to /register
                             in the top navigation bar

 2    Register Page          Fills in the registration form:       Form validates each field in real-time:
      (/register)            • Full Name                           • Name: 2–100 characters
                             • Email Address                       • Email: valid format, not duplicate
                             • Password                            • Password: min 8 chars, strength meter
                             • Confirm Password                    • Confirm: must match password

 3    Register Page          Clicks "Create Account" button        System processes registration:
      (/register)                                                  → Validates all fields (Zod schema)
                                                                   → Checks email uniqueness in DB
                                                                   → Hashes password (bcrypt, 12 rounds)
                                                                   → Creates User record (role: "user")
                                                                   → Signs JWT access token (15 min)
                                                                   → Signs JWT refresh token (7 days)
                                                                   → Returns user profile + both tokens

 4    User Dashboard         Sees personalized dashboard:          System stores tokens:
      (/dashboard)           • Welcome message: "Hi, Rahul!"      → accessToken in memory/localStorage
                             • Empty state: "No documents yet"     → refreshToken in httpOnly cookie
                             • Quick stats: 0 pending, 0 signed    → Redirects to /dashboard
                             • Sidebar with navigation links       → AuditLog: user registered
```

### 1.3 Registration Flow Diagram

```
    ┌──────────────────┐
    │   LANDING PAGE   │
    │   (/)            │
    │                  │
    │  "Get Started"   │
    │  "Login"         │
    └────────┬─────────┘
             │
             │ Clicks "Get Started"
             ▼
    ┌──────────────────┐
    │  REGISTER PAGE   │
    │  (/register)     │
    │                  │
    │  ┌────────────┐  │
    │  │ Full Name  │  │
    │  │ Email      │  │
    │  │ Password   │  │
    │  │ Confirm PW │  │
    │  └────────────┘  │
    │                  │
    │  [Create Account]│
    └────────┬─────────┘
             │
             │ POST /auth/register
             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │  VALIDATION      │───No──► │  ERROR STATE     │
    │                  │         │                  │
    │  • Format check  │         │  • "Email already│
    │  • Unique email  │         │    registered"   │
    │  • Password hash │         │  • "Password too │
    └────────┬─────────┘         │    weak"         │
             │                   │  • Inline errors │
             │ Yes (201 Created) └──────────────────┘
             ▼
    ┌──────────────────┐
    │  JWT ISSUED      │
    │                  │
    │  • Access Token  │
    │    (15 min)      │
    │  • Refresh Token │
    │    (7 days)      │
    └────────┬─────────┘
             │
             │ Auto-redirect
             ▼
    ┌──────────────────┐
    │  USER DASHBOARD  │
    │  (/dashboard)    │
    │                  │
    │  "Welcome, Rahul │
    │   Sharma!"       │
    │                  │
    │  No documents    │
    │  yet — you'll    │
    │  see them here   │
    │  when assigned.  │
    └──────────────────┘
```

### 1.4 Returning User — Login Flow

```
Step  Screen              User Action                     System Response
────  ──────────────────  ──────────────────────────────  ─────────────────────────────────────
 1    Landing Page (/)    Clicks "Login"                  Navigates to /login

 2    Login Page          Enters email + password          Validates credentials:
      (/login)            Clicks "Sign In"                 → Fetches user by email
                                                           → bcrypt.compare(password, hash)
                                                           → Signs new JWT pair
                                                           → Returns user + tokens

 3    Dashboard           Redirected based on role:        Role-based routing:
                          • role="user"  → /dashboard      → User sees their document list
                          • role="admin" → /admin/dashboard → Admin sees system overview
```

### 1.5 Login Flow Diagram

```
    ┌──────────────────┐
    │   LOGIN PAGE     │
    │   (/login)       │
    │                  │
    │  ┌────────────┐  │
    │  │ Email      │  │
    │  │ Password   │  │
    │  └────────────┘  │
    │                  │
    │  [Sign In]       │
    │  "New? Register" │
    └────────┬─────────┘
             │
             │ POST /auth/login
             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │  AUTH CHECK      │───No──► │  ERROR STATE     │
    │                  │         │                  │
    │  • Email exists? │         │  "Invalid email  │
    │  • Password      │         │   or password"   │
    │    matches?      │         │                  │
    └────────┬─────────┘         │  (no specifics   │
             │                   │   for security)  │
             │ Yes               └──────────────────┘
             ▼
    ┌──────────────────┐
    │  ROLE CHECK      │
    │                  │
    │  role = "admin"? │
    └───┬──────────┬───┘
        │          │
    Yes │          │ No (user)
        ▼          ▼
  ┌──────────┐ ┌──────────────┐
  │  ADMIN   │ │  USER        │
  │ DASHBOARD│ │  DASHBOARD   │
  │ /admin/  │ │  /dashboard  │
  │ dashboard│ │              │
  └──────────┘ └──────────────┘
```

### 1.6 UX Design Decisions

| Decision | Rationale |
|---|---|
| **No email verification on registration** | Hackathon speed — eliminates SMTP dependency for P0 |
| **Auto-login after registration** | Removes friction; user is immediately productive |
| **Role-based redirect on login** | Admin and user see completely different dashboards |
| **Generic login error message** | "Invalid email or password" — prevents email enumeration |
| **Password strength meter** | Visual feedback during typing, not a blocking requirement |
| **Inline field validation** | Errors appear below each field as user types — no surprise form rejections |

---

## 2. Identity Verification Flow

### 2.1 Overview

Identity verification is a **P1 feature** that adds trust before signing sensitive documents. When a document has `requiresVerification: true`, the user must complete a 3-step verification before the "Sign" button becomes active. The flow uses government ID upload + email OTP — no third-party KYC API for MVP.

### 2.2 When Is Verification Triggered?

```
┌──────────────────────────────────────────────────────────────────┐
│  VERIFICATION TRIGGER LOGIC                                      │
│                                                                  │
│  User clicks "Sign" on a document                                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────┐                                 │
│  │  document.requiresVerification                                │
│  │  === true?                  │                                 │
│  └──────┬──────────────┬───────┘                                 │
│     Yes │              │ No                                      │
│         ▼              ▼                                         │
│  ┌──────────────┐  ┌──────────────────┐                          │
│  │  user.        │  │ Go directly to   │                         │
│  │  isVerified   │  │ signing page     │                         │
│  │  === true?    │  │ (/documents/     │                         │
│  └──┬────────┬───┘  │  :id/sign)       │                         │
│  Yes│     No │      └──────────────────┘                         │
│     ▼        ▼                                                   │
│  ┌───────┐ ┌──────────────────┐                                  │
│  │ Sign  │ │ Redirect to      │                                  │
│  │ page  │ │ /verification    │                                  │
│  │       │ │ with banner:     │                                  │
│  │       │ │ "Verify your     │                                  │
│  │       │ │  identity first" │                                  │
│  └───────┘ └──────────────────┘                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Step-by-Step Interaction Path

```
Step  Screen                    User Action                      System Response
────  ────────────────────────  ───────────────────────────────  ──────────────────────────────────
 1    Document View             Clicks "Sign Document"            Checks: requiresVerification &&
      (/documents/:id)          on a document requiring           !user.isVerified
                                verification                      → Redirects to /verification
                                                                  → Shows info banner explaining why

 2    Verification Page         STEP 1 — Upload ID Document       Page shows 3-step progress bar:
      (/verification)           • Selects document type:           [● Upload] [○ OTP] [○ Verify]
                                  Aadhaar / Passport /
                                  Driving License / Other
                                • Clicks "Choose File" or
                                  drags file into drop zone
                                • File preview appears

 3    Verification Page         Clicks "Upload Document"          System processes:
      (/verification)                                              → Validates: JPEG/PNG, ≤ 5 MB
                                                                   → Uploads to Azure Blob Storage
                                                                   → Creates Verification record
                                                                     (status: "pending")
                                                                   → Shows success: "ID uploaded ✓"
                                                                   → Progress: [✓ Upload] [● OTP] [○ Verify]

 4    Verification Page         STEP 2 — Request OTP              System processes:
      (/verification)           Clicks "Send OTP"                  → Generates 6-digit OTP
                                                                   → Hashes OTP (bcrypt)
                                                                   → Stores hash + 10 min expiry
                                                                   → Sends OTP to user's email
                                                                   → Shows: "OTP sent to r***l@email.com"
                                                                   → Progress: [✓ Upload] [✓ Sent] [● Verify]
                                                                   → Starts 10-minute countdown timer

 5    Verification Page         STEP 3 — Enter OTP                System processes:
      (/verification)           • Types 6-digit code from email    → Fetches verification record
                                • Clicks "Verify"                  → bcrypt.compare(input, stored hash)
                                                                   → Checks otpExpiresAt > now
                                                                   → If valid:
                                                                      • Verification.status = "verified"
                                                                      • User.isVerified = true
                                                                      • Shows: "Identity Verified! ✓"
                                                                      • Progress: [✓ Upload] [✓ Sent] [✓ Verified]
                                                                   → If invalid/expired:
                                                                      • Shows: "Invalid or expired OTP"
                                                                      • "Resend OTP" button appears

 6    Verification Page         Clicks "Continue to Sign"          Redirects to /documents/:id/sign
      (/verification)           (or auto-redirect after 3 sec)     → "Sign" button now active
                                                                   → Verification badge shown on user profile
```

### 2.4 Verification Flow Diagram

```
    ┌──────────────────┐
    │  DOCUMENT VIEW   │
    │  "Sign Document" │
    │  button clicked  │
    └────────┬─────────┘
             │
             │ requiresVerification && !isVerified
             ▼
    ┌──────────────────────────────────────────────────────┐
    │  VERIFICATION PAGE (/verification)                    │
    │                                                       │
    │  Progress:  [● Upload]  [○ OTP]  [○ Verify]          │
    │                                                       │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │  STEP 1: Upload Identity Document               │  │
    │  │                                                 │  │
    │  │  Document Type:  [Aadhaar ▼]                    │  │
    │  │                                                 │  │
    │  │  ┌───────────────────────────────┐              │  │
    │  │  │                               │              │  │
    │  │  │   Drag & drop your ID here    │              │  │
    │  │  │   or click to browse          │              │  │
    │  │  │                               │              │  │
    │  │  │   JPEG / PNG, max 5 MB        │              │  │
    │  │  │                               │              │  │
    │  │  └───────────────────────────────┘              │  │
    │  │                                                 │  │
    │  │  [Upload Document]                              │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    └──────────────────────┬────────────────────────────────┘
                           │
                           │ POST /verification/upload-id
                           │ (multipart/form-data)
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │  Progress:  [✓ Upload]  [● OTP]  [○ Verify]          │
    │                                                       │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │  STEP 2: Email Verification                     │  │
    │  │                                                 │  │
    │  │  "We'll send a 6-digit code to your             │  │
    │  │   registered email address."                    │  │
    │  │                                                 │  │
    │  │   r***l@email.com                               │  │
    │  │                                                 │  │
    │  │  [Send OTP]                                     │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    └──────────────────────┬────────────────────────────────┘
                           │
                           │ POST /verification/send-otp
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │  Progress:  [✓ Upload]  [✓ Sent]  [● Verify]         │
    │                                                       │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │  STEP 3: Enter OTP                              │  │
    │  │                                                 │  │
    │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │  │
    │  │  │ 4 │ │ 8 │ │ 2 │ │ 9 │ │ 1 │ │ 7 │          │  │
    │  │  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │  │
    │  │                                                 │  │
    │  │  Expires in: 09:42                              │  │
    │  │                                                 │  │
    │  │  [Verify]     [Resend OTP]                      │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                       │
    └──────────────────────┬────────────────────────────────┘
                           │
                           │ POST /verification/verify-otp
                           ▼
              ┌────────────┴────────────┐
              │                         │
         Valid OTP               Invalid / Expired
              │                         │
              ▼                         ▼
    ┌──────────────────┐     ┌──────────────────┐
    │  ✓ VERIFIED      │     │  ✗ ERROR         │
    │                  │     │                  │
    │  "Your identity  │     │  "Invalid or     │
    │   has been       │     │   expired OTP"   │
    │   verified!"     │     │                  │
    │                  │     │  [Resend OTP]    │
    │  [Continue to    │     │  (resets timer)  │
    │   Sign Document] │     │                  │
    └────────┬─────────┘     └──────────────────┘
             │
             │ Auto-redirect (3s)
             ▼
    ┌──────────────────┐
    │  SIGN DOCUMENT   │
    │  (/documents/    │
    │   :id/sign)      │
    │                  │
    │  ✓ Verified      │
    │  badge shown     │
    └──────────────────┘
```

### 2.5 Verification States

| Status | UI Indicator | User Can Sign? | Next Action |
|---|---|---|---|
| **Not started** | Gray badge: "Unverified" | Only if document doesn't require it | Click "Verify Identity" |
| **Pending** | Yellow badge: "Verification Pending" | No | Complete OTP step |
| **Verified** | Green badge: "✓ Verified" | Yes | Proceed to sign |
| **Rejected** | Red badge: "Verification Rejected" | No | Re-upload & retry |

### 2.6 UX Design Decisions

| Decision | Rationale |
|---|---|
| **3-step progress bar** | Users see exactly where they are and what's left — reduces abandonment |
| **Masked email display** | Shows `r***l@email.com` — confirms correct email without full exposure |
| **10-minute countdown timer** | Creates urgency; shows exactly when OTP expires |
| **Auto-advance on upload success** | Less clicking — system moves to next step automatically |
| **"Resend OTP" after expiry** | No dead-end state; user can always recover |
| **Auto-redirect after verification** | Takes user back to their document seamlessly |

---

## 3. Main Feature Flow — Agreement & E-Signature

### 3.1 Overview

This is the **core user journey**: a user receives an agreement, reviews the PDF, draws their signature, and submits. The flow spans 4 screens and involves a document status transition from `sent → viewed → signed`.

### 3.2 Step-by-Step Interaction Path

```
Step  Screen                     User Action                      System Response
────  ─────────────────────────  ───────────────────────────────  ──────────────────────────────────
 1    User Dashboard             Sees notification badge or        Dashboard shows:
      (/dashboard)               "1 document awaiting signature"   • Pending Documents count
                                 Clicks "View Documents" or        • Recent document cards
                                 clicks the document card           • Status badges (color-coded)

 2    Document List              Sees list of assigned documents   Documents filtered by user's ID:
      (/documents)               with status badges:                • "sent" docs shown with blue badge
                                 🔵 Sent (new, unread)             • "viewed" with yellow badge
                                 🟡 Viewed (already opened)        • "signed" with green badge
                                 🟢 Signed                         • "completed" with gray badge
                                 ⚫ Completed
                                 Clicks "Offer Letter — Rahul"

 3    Document View              Sees full document detail:         System automatically:
      (/documents/:id)           • PDF preview (rendered via        → Updates status: "sent" → "viewed"
                                   react-pdf in-browser)            → Creates AuditLog: action="viewed"
                                 • Document title & assigned date   → Badge changes from 🔵 to 🟡
                                 • Status timeline showing
                                   progression
                                 • Action buttons:
                                   [Download PDF] [Sign Document]

 4    Document View              Clicks "Sign Document"             Checks prerequisites:
      (/documents/:id)                                              → If requiresVerification && !isVerified:
                                                                      redirect to /verification
                                                                    → If all clear:
                                                                      navigate to /documents/:id/sign

 5    Sign Document              Sees split-screen signing page:    Page layout:
      (/documents/:id/sign)      LEFT: PDF preview (scrollable)    • PDF loaded via react-pdf
                                 RIGHT: Signature canvas panel      • signature_pad library on canvas
                                                                    • Clear button resets canvas

 6    Sign Document              Draws signature on canvas using    Real-time canvas rendering
      (/documents/:id/sign)      mouse (desktop) or finger          • Ink follows cursor/touch
                                 (mobile/tablet)                    • Smooth bezier curves
                                                                    • Undo: "Clear Signature" button

 7    Sign Document              Clicks "Review Signature"          System shows preview:
      (/documents/:id/sign)                                         → Captures canvas as PNG (base64)
                                                                    → Overlays signature on PDF
                                                                    → Shows: "This is how your signature
                                                                      will appear on the document"

 8    Sign Document              Reviews the preview                Modal displays:
      (/documents/:id/sign)      Clicks "Confirm & Sign"            → Warning: "This action is permanent.
                                                                      The document will be locked after
                                                                      signing and cannot be modified."
                                                                    → Checkbox: "I confirm this is my
                                                                      signature and I agree to the terms"
                                                                    → [Cancel] [Confirm & Sign]

 9    Sign Document              Checks confirmation box             System processes (POST /documents/:id/sign):
      (/documents/:id/sign)      Clicks "Confirm & Sign"             → Uploads signature PNG to Azure Blob
                                                                      → Embeds signature into PDF (pdf-lib)
                                                                      → Uploads signed PDF to Azure Blob
                                                                      → Creates Signature record:
                                                                        { documentId, signedBy, signatureImageUrl,
                                                                          signedPdfUrl, ipAddress, userAgent, signedAt }
                                                                      → Updates Document status → "signed"
                                                                      → Creates AuditLog: action="signed"
                                                                      → Document locked (no further edits)
                                                                      → Email notification to admin (P1)

 10   Success State              Sees confirmation screen:           Page shows:
      (/documents/:id)           "Document signed successfully! ✓"   → Green success banner
                                 • Signed PDF preview                → [Download Signed PDF] button
                                 • Download link                     → Status timeline updated
                                 • "Return to Dashboard" link        → Badge: 🟢 Signed
```

### 3.3 Agreement & E-Signature Flow Diagram

```
    ┌──────────────────────────────────────────────────────────────┐
    │  USER DASHBOARD (/dashboard)                                 │
    │                                                              │
    │  ┌──────────────────────────────────────────┐                │
    │  │  📄 You have 1 document awaiting action   │                │
    │  │                                          │                │
    │  │  Offer Letter — Rahul Sharma    🔵 Sent  │                │
    │  │  Assigned: March 5, 2026                 │                │
    │  │  [View Document]                         │                │
    │  └────────────────────┬─────────────────────┘                │
    │                       │                                      │
    └───────────────────────┼──────────────────────────────────────┘
                            │
                            │ Clicks "View Document"
                            ▼
    ┌──────────────────────────────────────────────────────────────┐
    │  DOCUMENT VIEW (/documents/:id)                              │
    │                                                              │
    │  Title: Offer Letter — Rahul Sharma                          │
    │  Status: 🟡 Viewed      (auto-updated from "sent")           │
    │  Assigned by: Priya Patel  |  Date: March 5, 2026            │
    │                                                              │
    │  ┌──────────────────────────────────────┐                    │
    │  │                                      │                    │
    │  │         PDF PREVIEW                  │                    │
    │  │         (react-pdf)                  │                    │
    │  │                                      │                    │
    │  │   Dear Rahul Sharma,                 │                    │
    │  │   We are pleased to offer you the    │                    │
    │  │   position of Software Engineer...   │                    │
    │  │                                      │                    │
    │  └──────────────────────────────────────┘                    │
    │                                                              │
    │  ── Status Timeline ──────────────────────────               │
    │  ✓ Created (Mar 5)  ✓ Sent (Mar 5)  ● Viewed (Now)          │
    │    ○ Signed  ○ Completed                                     │
    │                                                              │
    │  [Download PDF]         [Sign Document →]                    │
    │                                                              │
    └─────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ Clicks "Sign Document"
                                  ▼
                       ┌──────────┴──────────┐
                       │ Requires            │
                       │ Verification?       │
                       └──┬──────────────┬───┘
                      Yes │              │ No / Already Verified
                          ▼              ▼
                ┌──────────────┐  ┌──────────────────────────────────────┐
                │ Redirect to  │  │  SIGN PAGE (/documents/:id/sign)    │
                │ /verification│  │                                      │
                │ (see §2)     │  │  ┌─────────────┐ ┌───────────────┐  │
                └──────────────┘  │  │  PDF PREVIEW │ │  SIGNATURE    │  │
                                  │  │  (left side) │ │  CANVAS       │  │
                                  │  │              │ │  (right side) │  │
                                  │  │  Scrollable  │ │               │  │
                                  │  │  full PDF    │ │  Draw here    │  │
                                  │  │              │ │  with mouse   │  │
                                  │  │              │ │  or touch     │  │
                                  │  │              │ │               │  │
                                  │  │              │ │  [Clear]      │  │
                                  │  └─────────────┘ └───────────────┘  │
                                  │                                      │
                                  │  [← Back]     [Review Signature →]  │
                                  │                                      │
                                  └──────────────────┬───────────────────┘
                                                     │
                                                     │ Clicks "Review Signature"
                                                     ▼
                                  ┌──────────────────────────────────────┐
                                  │  SIGNATURE PREVIEW MODAL             │
                                  │                                      │
                                  │  "This is how your signature will    │
                                  │   appear on the document:"           │
                                  │                                      │
                                  │  ┌──────────────────────────────┐    │
                                  │  │  [PDF page with signature    │    │
                                  │  │   overlaid at bottom]        │    │
                                  │  └──────────────────────────────┘    │
                                  │                                      │
                                  │  ⚠ "This action is permanent.       │
                                  │   The document will be locked        │
                                  │   after signing."                    │
                                  │                                      │
                                  │  ☐ I confirm this is my signature    │
                                  │    and I agree to the terms          │
                                  │                                      │
                                  │  [Cancel]       [Confirm & Sign]    │
                                  │                                      │
                                  └──────────────────┬───────────────────┘
                                                     │
                                                     │ POST /documents/:id/sign
                                                     │ { signatureImage: "base64..." }
                                                     ▼
                                  ┌──────────────────────────────────────┐
                                  │  ✓ DOCUMENT SIGNED SUCCESSFULLY     │
                                  │                                      │
                                  │  "Offer Letter — Rahul Sharma"       │
                                  │   has been signed and locked.        │
                                  │                                      │
                                  │  Status: 🟢 Signed                   │
                                  │  Signed at: March 6, 2026, 10:30 AM │
                                  │                                      │
                                  │  [Download Signed PDF]               │
                                  │  [Return to Dashboard]               │
                                  │                                      │
                                  └──────────────────────────────────────┘
```

### 3.4 Document Download Sub-Flow

```
    User clicks "Download PDF" (on any document they have access to)
         │
         │ GET /documents/:id/download
         ▼
    ┌──────────────────┐
    │  SERVER           │
    │                  │
    │  1. Verify JWT    │
    │  2. Check access  │
    │     (user owns    │
    │      doc OR is    │
    │      admin)       │
    │  3. Generate SAS  │
    │     URL (15 min   │
    │     expiry)       │
    │  4. Return URL    │
    └────────┬─────────┘
             │
             │ SAS URL returned to client
             ▼
    ┌──────────────────┐
    │  BROWSER          │
    │                  │
    │  Direct download  │
    │  from Azure Blob  │
    │  Storage          │
    │  (bypasses server)│
    │                  │
    │  AuditLog:        │
    │  action="download"│
    └──────────────────┘
```

### 3.5 UX Design Decisions

| Decision | Rationale |
|---|---|
| **Auto-update "sent" → "viewed"** | No explicit "Mark as Read" — reduces friction, mirrors email behavior |
| **Split-screen signing** | PDF and canvas side-by-side — user references the document while signing |
| **Mandatory confirmation modal** | Legal protection — user explicitly acknowledges the action is permanent |
| **Checkbox before final submit** | Prevents accidental signatures; creates an explicit consent record |
| **Post-signing lock** | Document becomes read-only — builds trust that signed docs are tamper-proof |
| **Immediate download availability** | After signing, user can download — no waiting for processing |

---

## 4. Admin Workflow

### 4.1 Overview

The admin workflow covers three primary responsibilities: **document lifecycle management** (create templates, generate & assign documents), **identity verification review** (P1), and **system monitoring** (dashboard, audit logs). All admin pages live under the `/admin/*` route namespace.

### 4.2 Admin — Template Creation Flow

```
Step  Screen                     Admin Action                     System Response
────  ─────────────────────────  ───────────────────────────────  ──────────────────────────────────
 1    Admin Dashboard            Clicks "Templates" in sidebar     Navigates to /admin/templates
      (/admin/dashboard)         or clicks "Create Template"
                                 quick action button

 2    Template List              Sees table of existing templates   Shows: title, placeholder count,
      (/admin/templates)         Clicks "+ New Template"            created date, active/inactive status

 3    Create Template            Fills template form:               Form features:
      (/admin/templates/new)     • Title: "Offer Letter"           • Live placeholder extraction
                                 • Content area (rich text):         from content as user types
                                   "Dear {{employee_name}},         {{...}} detected → added to
                                    We offer you the position        placeholder list automatically
                                    of {{designation}} at
                                    {{company_name}}..."            • Placeholder chips shown below
                                                                     content area (removable)

 4    Create Template            Reviews extracted placeholders:    System validates:
      (/admin/templates/new)     [employee_name] [designation]      → Title not empty
                                 [company_name] [salary]             → Content not empty
                                 [start_date] [hr_name]              → At least 1 placeholder found
                                 Clicks "Save Template"

 5    Template List              Sees success toast:                Template saved in DB:
      (/admin/templates)         "Template 'Offer Letter'           → isActive: true
                                  created successfully ✓"            → placeholders array stored
                                 Template appears in list            → createdBy: admin's ID
```

### 4.3 Admin — Document Generation & Assignment Flow

```
Step  Screen                     Admin Action                     System Response
────  ─────────────────────────  ───────────────────────────────  ──────────────────────────────────
 1    Admin Dashboard            Clicks "Generate Document"         Navigates to
      (/admin/dashboard)         quick action button                /admin/documents/generate

 2    Generate Document          STEP 1 — Select Template           Dropdown lists all active templates
      (/admin/documents/         Selects "Offer Letter"             Selecting template auto-loads its
      generate)                  from dropdown                      placeholders as empty form fields

 3    Generate Document          STEP 2 — Fill Placeholder Values   Dynamic form generated:
      (/admin/documents/         • employee_name: "Rahul Sharma"    • One text input per placeholder
      generate)                  • designation: "Software Engineer"  • All fields required
                                 • company_name: "TechCorp India"   • Live preview panel shows filled
                                 • salary: "₹12,00,000"              content (placeholders replaced
                                 • start_date: "2026-04-01"          with entered values in real-time)
                                 • hr_name: "Priya Patel"

 4    Generate Document          STEP 3 — Assign to User            User dropdown shows all registered
      (/admin/documents/         Selects "Rahul Sharma"              users with email
      generate)                  (rahul@email.com) from              Checkbox: "Require identity
                                 user dropdown                       verification before signing"

 5    Generate Document          Clicks "Generate & Send"            System processes:
      (/admin/documents/                                             → Replaces all {{placeholders}} in content
      generate)                                                      → Generates PDF via pdf-lib
                                                                     → Uploads PDF to Azure Blob Storage
                                                                     → Creates Document record:
                                                                       status="sent", assignedTo, assignedBy
                                                                     → Creates AuditLog: "sent"
                                                                     → Sends email to user (P1)
                                                                     → Shows toast: "Document sent to
                                                                       Rahul Sharma ✓"

 6    Admin Documents            Navigates to document list          Document visible with status "sent"
      (/admin/documents)         to track progress                   Can click to view details & audit trail
```

### 4.4 Admin — Document Generation Flow Diagram

```
    ┌──────────────────────────────────────────────────────────────┐
    │  GENERATE DOCUMENT (/admin/documents/generate)               │
    │                                                              │
    │  Step 1 of 3: Select Template                                │
    │  ┌──────────────────────────────────────────┐                │
    │  │  Template:  [Offer Letter           ▼]   │                │
    │  └──────────────────────────────────────────┘                │
    │                       │                                      │
    │                       │ Template selected → placeholders load │
    │                       ▼                                      │
    │  Step 2 of 3: Fill Values                                    │
    │  ┌──────────────────────────────────────────┐                │
    │  │  employee_name:  [Rahul Sharma         ] │                │
    │  │  designation:    [Software Engineer     ] │                │
    │  │  company_name:   [TechCorp India       ] │                │
    │  │  salary:         [₹12,00,000           ] │                │
    │  │  start_date:     [2026-04-01           ] │                │
    │  │  hr_name:        [Priya Patel          ] │                │
    │  └──────────────────────────────────────────┘                │
    │                       │                                      │
    │                       │ All fields filled                     │
    │                       ▼                                      │
    │  Step 3 of 3: Assign to User                                 │
    │  ┌──────────────────────────────────────────┐                │
    │  │  Assign to: [Rahul Sharma (rahul@...)▼]  │                │
    │  │                                          │                │
    │  │  ☐ Require identity verification         │                │
    │  │    before signing                        │                │
    │  └──────────────────────────────────────────┘                │
    │                       │                                      │
    │  [← Back]             │              [Generate & Send →]     │
    │                       │                                      │
    └───────────────────────┼──────────────────────────────────────┘
                            │
                            │ POST /documents/generate
                            ▼
                 ┌─────────────────────┐
                 │  PROCESSING         │
                 │                     │
                 │  1. Fill content    │
                 │  2. Generate PDF    │
                 │  3. Upload Azure    │
                 │  4. Save Document   │
                 │  5. Send email (P1) │
                 │  6. Log audit       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  ✓ SUCCESS          │
                 │                     │
                 │  "Offer Letter sent │
                 │   to Rahul Sharma"  │
                 │                     │
                 │  [View Document]    │
                 │  [Generate Another] │
                 └─────────────────────┘
```

### 4.5 Admin — Verification Review Flow (P1)

```
Step  Screen                     Admin Action                     System Response
────  ─────────────────────────  ───────────────────────────────  ──────────────────────────────────
 1    Admin Dashboard            Sees notification:                 Badge on "Users" nav item:
      (/admin/dashboard)         "2 verifications pending review"   shows pending count
                                 Clicks "Users" in sidebar

 2    User Management            Sees user table with columns:      Table columns:
      (/admin/users)             Name | Email | Role | Verified     • Verified column shows:
                                 Clicks user "Rahul Sharma"          ✓ Verified (green)
                                 who shows "⏳ Pending"               ⏳ Pending (yellow)
                                                                     ✗ Unverified (gray)

 3    User Detail / Review       Sees verification details:         Shows:
      Modal or expandable row    • ID Type: Aadhaar                 • ID document image (via SAS URL)
                                 • Uploaded: March 6, 2026           • OTP verification status
                                 • OTP Status: Verified ✓            • Upload timestamp

 4    User Detail / Review       Clicks "Approve" or "Reject"       If Approved:
                                                                     → User.isVerified = true
                                                                     → Verification.status = "verified"
                                                                     → Toast: "Rahul Sharma verified ✓"
                                                                    If Rejected:
                                                                     → Verification.status = "rejected"
                                                                     → Toast: "Verification rejected"
                                                                     → User must re-upload
```

### 4.6 Admin — Monitoring & Audit Flow

```
    ┌──────────────────────────────────────────────────────────────┐
    │  ADMIN DASHBOARD (/admin/dashboard)                          │
    │                                                              │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
    │  │Total Docs│ │ Pending  │ │  Signed  │ │  Users   │       │
    │  │   156    │ │   32     │ │   45     │ │   89     │       │
    │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
    │                                                              │
    │  ── Quick Actions ──────────────────────────                 │
    │  [Create Template]  [Generate Document]  [View All Docs]     │
    │                                                              │
    │  ── Recent Activity Feed ────────────────────────            │
    │  │ 10:30 AM  Rahul signed "Offer Letter"     🟢 signed     │
    │  │ 10:15 AM  Rahul viewed "Offer Letter"     🟡 viewed     │
    │  │ 09:00 AM  Priya sent "NDA" to Ananya      🔵 sent       │
    │  │ Yesterday  Priya created template "NDA"   ⚪ created     │
    │  │                                                          │
    │  [View Full Audit Log →]                                     │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘
                            │
                            │ Clicks "View Full Audit Log"
                            ▼
    ┌──────────────────────────────────────────────────────────────┐
    │  AUDIT LOGS (/admin/audit-logs)                              │
    │                                                              │
    │  Filters: [Action ▼] [User ▼] [Date Range 📅]               │
    │                                                              │
    │  ┌──────────────────────────────────────────────────────┐    │
    │  │ Timestamp         Action      Document       User    │    │
    │  │─────────────────────────────────────────────────────│    │
    │  │ Mar 6, 10:30 AM  signed     Offer Letter    Rahul   │    │
    │  │ Mar 6, 10:15 AM  viewed     Offer Letter    Rahul   │    │
    │  │ Mar 6, 09:00 AM  sent       NDA             Priya   │    │
    │  │ Mar 5, 04:30 PM  created    Offer Letter    Priya   │    │
    │  │ Mar 5, 03:00 PM  created    NDA Template    Priya   │    │
    │  │                                                      │    │
    │  │ Page 1 of 3        [← Prev]  [Next →]               │    │
    │  └──────────────────────────────────────────────────────┘    │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘
```

### 4.7 Admin RBAC Summary

```
    ┌─────────────────────────────────────────────────────────┐
    │             ADMIN ACCESS MAP                            │
    │                                                         │
    │  LOGIN (role="admin")                                   │
    │    │                                                    │
    │    ├──► /admin/dashboard    → Stats + Activity Feed     │
    │    │                                                    │
    │    ├──► /admin/templates    → CRUD templates            │
    │    │    ├── /new            → Create template form      │
    │    │    └── /:id/edit       → Edit template form        │
    │    │                                                    │
    │    ├──► /admin/documents    → View all documents        │
    │    │    └── /generate       → Fill template + assign    │
    │    │                                                    │
    │    ├──► /admin/users        → List users + roles        │
    │    │    └── Review verification (P1)                    │
    │    │                                                    │
    │    ├──► /admin/audit-logs   → Full activity trail       │
    │    │                                                    │
    │    └──► /admin/analytics    → Charts & metrics (P1)     │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

---

## 5. Completing the Platform Goal — Full Document Lifecycle

### 5.1 Overview

This section traces a **single document from birth to archive** — spanning all actors, all status transitions, and all system events. It demonstrates the complete platform goal: secure digital documentation with identity verification and e-signatures.

### 5.2 Full Lifecycle — Narrative

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SETUP                                                         │
│  Actor: Admin (Priya)                                                   │
│                                                                         │
│  1. Priya logs into the admin dashboard                                 │
│  2. Creates a document template "Offer Letter" with placeholders:       │
│     {{employee_name}}, {{designation}}, {{company_name}}, {{salary}},   │
│     {{start_date}}, {{hr_name}}                                         │
│  3. Template saved → available for document generation                  │
│                                                                         │
│  System: Template record created in DB                                  │
│  Audit: action="created", performedBy=Priya                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DOCUMENT GENERATION                                           │
│  Actor: Admin (Priya)                                                   │
│                                                                         │
│  4. Priya navigates to "Generate Document"                              │
│  5. Selects "Offer Letter" template                                     │
│  6. Fills all placeholder values for Rahul Sharma                       │
│  7. Assigns to Rahul's account, checks "Requires Verification"          │
│  8. Clicks "Generate & Send"                                            │
│                                                                         │
│  System:                                                                │
│  → Content filled, PDF generated (pdf-lib)                              │
│  → PDF uploaded to Azure Blob Storage                                   │
│  → Document record: status = "sent"                                     │
│  → Email notification sent to Rahul (P1)                                │
│  Audit: action="sent", performedBy=Priya                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: USER RECEIVES & REVIEWS                                       │
│  Actor: User (Rahul)                                                    │
│                                                                         │
│  9.  Rahul logs in → sees "1 document awaiting action" on dashboard     │
│  10. Opens "Offer Letter — Rahul Sharma"                                │
│  11. Reviews PDF content in-browser (react-pdf preview)                 │
│                                                                         │
│  System:                                                                │
│  → Document status: "sent" → "viewed"                                   │
│  Audit: action="viewed", performedBy=Rahul                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: IDENTITY VERIFICATION (P1)                                    │
│  Actor: User (Rahul)                                                    │
│                                                                         │
│  12. Rahul clicks "Sign" → system detects requiresVerification=true     │
│  13. Redirected to /verification                                        │
│  14. Uploads Aadhaar card photo (JPEG, 2.1 MB)                          │
│  15. Clicks "Send OTP" → receives 6-digit code via email                │
│  16. Enters OTP → verified successfully                                 │
│  17. User.isVerified = true                                             │
│                                                                         │
│  System:                                                                │
│  → ID image uploaded to Azure Blob (encrypted at rest)                  │
│  → OTP hashed, stored with 10 min expiry                                │
│  → Verification status: "pending" → "verified"                          │
│  Audit: action="verified", performedBy=Rahul                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: E-SIGNATURE                                                   │
│  Actor: User (Rahul)                                                    │
│                                                                         │
│  18. Rahul returns to sign page (auto-redirected after verification)    │
│  19. Draws signature on canvas (signature_pad)                          │
│  20. Reviews signature preview overlaid on PDF                          │
│  21. Confirms: "I confirm this is my signature" → "Confirm & Sign"      │
│                                                                         │
│  System:                                                                │
│  → Signature PNG captured, uploaded to Azure Blob                       │
│  → Signature embedded into PDF (pdf-lib)                                │
│  → Signed PDF uploaded to Azure Blob                                    │
│  → Signature record created (with IP, userAgent, timestamp)             │
│  → Document status: "viewed" → "signed"                                 │
│  → Document locked (immutable)                                          │
│  Audit: action="signed", performedBy=Rahul, ip=103.21.244.15           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: COMPLETION & STORAGE                                          │
│  Actors: Admin (Priya) + User (Rahul)                                   │
│                                                                         │
│  22. Priya sees "Offer Letter" status change to "signed" on dashboard   │
│  23. Priya reviews the signed PDF and audit trail                       │
│  24. Priya marks document as "completed"                                │
│  25. Rahul downloads signed PDF anytime via SAS URL                     │
│                                                                         │
│  System:                                                                │
│  → Document status: "signed" → "completed"                              │
│  → Signed PDF persists in Azure Blob Storage (encrypted at rest)        │
│  → Full audit trail preserved: created → sent → viewed →                │
│    verified → signed → completed (6 entries with timestamps, IPs)       │
│  Audit: action="completed", performedBy=Priya                           │
│                                                                         │
│  FINAL STATE:                                                           │
│  ✓ Document generated from template                                     │
│  ✓ Identity verified via government ID + OTP                            │
│  ✓ Electronically signed with signature image + consent                 │
│  ✓ Stored securely in cloud with encryption                             │
│  ✓ Complete audit trail for compliance                                  │
│  ✓ Downloadable by both admin and user                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Lifecycle Status Timeline

```
    TIME ──────────────────────────────────────────────────────────────►

    ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐
    │ DRAFT  │─►│  SENT  │─►│ VIEWED │─►│ VERIFIED │─►│ SIGNED │─►│ COMPLETED │
    │        │  │        │  │        │  │   (P1)   │  │        │  │           │
    │ Admin  │  │ Admin  │  │ User   │  │  User    │  │ User   │  │  Admin    │
    │creates │  │assigns │  │ opens  │  │ verifies │  │ signs  │  │ confirms  │
    │ doc    │  │to user │  │  doc   │  │ identity │  │  doc   │  │           │
    │        │  │        │  │        │  │          │  │        │  │           │
    │ Mar 5  │  │ Mar 5  │  │ Mar 6  │  │  Mar 6   │  │ Mar 6  │  │  Mar 6    │
    │ 2:00PM │  │ 2:01PM │  │ 9:15AM │  │ 10:05AM  │  │10:30AM │  │ 11:00AM   │
    └────────┘  └────────┘  └────────┘  └──────────┘  └────────┘  └───────────┘

    ACTOR:  Admin            User                        User         Admin
    AUDIT:  created    sent   viewed      verified       signed    completed
```

### 5.4 Data Records Created Across Lifecycle

| Phase | Records Created / Modified |
|---|---|
| **Setup** | 1 Template record |
| **Generation** | 1 Document record (status: sent), 1 AuditLog (sent), 1 PDF in Azure Blob |
| **Review** | Document updated (status: viewed), 1 AuditLog (viewed) |
| **Verification** | 1 Verification record, User updated (isVerified: true), 1 ID image in Azure Blob, 1 AuditLog (verified) |
| **Signing** | 1 Signature record, Document updated (status: signed), 1 signature PNG in Azure Blob, 1 signed PDF in Azure Blob, 1 AuditLog (signed) |
| **Completion** | Document updated (status: completed), 1 AuditLog (completed) |
| **Total** | **4 DB records created**, **2 DB records updated**, **4 files in Azure Blob**, **5 audit log entries** |

---

## 6. Flow Diagrams

### 6.1 Master Flow — Complete Platform Journey

```
    ┌─────────────────────────────────────────────────────────────────┐
    │                  COMPLETE PLATFORM JOURNEY                       │
    │                                                                 │
    │  ════════════════════════════════════════════════════════════    │
    │  ADMIN PATH                        USER PATH                    │
    │  ════════════════════════════════════════════════════════════    │
    │                                                                 │
    │  Admin visits platform             User visits platform         │
    │         │                                  │                    │
    │         ▼                                  ▼                    │
    │  Login (/login)                    Register (/register)         │
    │  role="admin"                      role="user"                  │
    │         │                                  │                    │
    │         ▼                                  ▼                    │
    │  Admin Dashboard                   User Dashboard               │
    │  (/admin/dashboard)                (/dashboard)                 │
    │         │                                  │                    │
    │         ▼                                  │ (waits for         │
    │  Create Template ◄──────────────┐          │  document)         │
    │  (/admin/templates/new)         │          │                    │
    │         │                       │          │                    │
    │         ▼                       │          │                    │
    │  Generate & Assign              │          │                    │
    │  Document                       │          │                    │
    │  (/admin/documents/generate)    │          │                    │
    │         │                       │          │                    │
    │         │ ──── email (P1) ──────│────────► │                    │
    │         │                       │          │                    │
    │         │                       │          ▼                    │
    │         │                       │   View Document               │
    │         │                       │   (/documents/:id)            │
    │         │                       │   status: sent → viewed       │
    │         │                       │          │                    │
    │         │                       │          ▼                    │
    │         │                       │   ┌──────────────────┐        │
    │         │                       │   │ Requires         │        │
    │         │                       │   │ Verification?    │        │
    │         │                       │   └──┬───────────┬───┘        │
    │         │                       │   Yes│           │No          │
    │         │                       │      ▼           │            │
    │         │                       │   Verify ID      │            │
    │         │                       │   (/verification) │            │
    │         │                       │   Upload + OTP    │            │
    │         │                       │      │           │            │
    │         │                       │      ▼           │            │
    │         │                       │   Verified ──────┤            │
    │         │                       │                  │            │
    │         │                       │                  ▼            │
    │         │                       │          Sign Document        │
    │         │                       │          (/documents/         │
    │         │                       │           :id/sign)           │
    │         │                       │          Draw + Confirm       │
    │         │                       │                  │            │
    │         │                       │                  ▼            │
    │         │                       │          ✓ Document Signed    │
    │         │                       │          status: signed       │
    │         │                       │                  │            │
    │         ▼                       │                  │            │
    │  Monitor Status ◄───────────────│──────────────────┘            │
    │  (/admin/documents)             │                               │
    │         │                       │                               │
    │         ▼                       │                               │
    │  Review & Complete              │                               │
    │  status: completed              │                               │
    │         │                       │                               │
    │         ▼                       │          ▼                    │
    │  Audit Trail                    │   Download Signed PDF         │
    │  (/admin/audit-logs)            │   (SAS URL → Azure Blob)     │
    │                                 │                               │
    │  ════════════════════════════════════════════════════════════    │
    │  DOCUMENT: ✓ Generated  ✓ Verified  ✓ Signed  ✓ Stored         │
    │  ════════════════════════════════════════════════════════════    │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
```

### 6.2 User Registration Flow (Simplified)

```
    User Visits Platform (/)
              │
              ▼
    Clicks "Get Started"
              │
              ▼
    Register Page (/register)
    Enters: Name, Email, Password
              │
              ▼
    System: Validates → Hashes Password → Creates Account → Issues JWT
              │
              ▼
    Auto-Login → Redirect
              │
              ▼
    ┌─────────┴─────────┐
    │ role = "admin"?   │
    └──┬─────────────┬──┘
    Yes│             │No
       ▼             ▼
    Admin          User
    Dashboard      Dashboard
    (/admin/       (/dashboard)
    dashboard)     "Welcome! No docs yet."
```

### 6.3 Identity Verification Flow (Simplified)

```
    User Clicks "Sign" on Verified-Required Document
              │
              ▼
    System Checks: user.isVerified?
              │
         No ──┤── Yes → Go to Sign Page
              │
              ▼
    Redirect to /verification
              │
              ▼
    Step 1: Upload Government ID
    Select type: [Aadhaar / Passport / DL / Other]
    Upload image (JPEG/PNG, ≤5 MB)
              │
              ▼
    Step 2: Request OTP
    Click "Send OTP" → Email sent
              │
              ▼
    Step 3: Enter 6-Digit OTP
    Type code → Click "Verify"
              │
              ▼
    ┌─────────┴──────────┐
    │ OTP Valid & Fresh? │
    └──┬──────────────┬──┘
    Yes│              │No
       ▼              ▼
    ✓ Verified     "Invalid/Expired"
    isVerified     [Resend OTP]
    = true              │
       │                │ (retry)
       ▼                └──► Step 2
    Redirect to Sign Page
    (/documents/:id/sign)
```

### 6.4 Agreement & E-Signature Flow (Simplified)

```
    User Dashboard — "1 document pending"
              │
              ▼
    Document List (/documents)
    Clicks document → Opens detail
              │
              ▼
    Document View (/documents/:id)
    PDF preview shown, status: sent → viewed (auto)
              │
              ▼
    Clicks "Sign Document"
              │
              ▼
    Sign Page (/documents/:id/sign)
    LEFT: PDF preview  |  RIGHT: Signature canvas
              │
              ▼
    Draws signature on canvas (mouse / touch)
              │
              ▼
    Clicks "Review Signature"
    Preview: signature overlaid on PDF
              │
              ▼
    Confirmation Modal
    ☑ "I confirm this is my signature"
    Clicks "Confirm & Sign"
              │
              ▼
    System: Upload signature → Embed in PDF → Lock document
    Status: viewed → signed
              │
              ▼
    ✓ Success — "Document Signed!"
    [Download Signed PDF]  [Return to Dashboard]
```

### 6.5 Admin Workflow Flow (Simplified)

```
    Admin Login → Admin Dashboard (/admin/dashboard)
              │
              ├──► Create Template
              │    /admin/templates/new
              │    Title + Content with {{placeholders}}
              │    Save → Template ready
              │         │
              │         ▼
              ├──► Generate Document
              │    /admin/documents/generate
              │    Select template → Fill values → Assign to user
              │    "Generate & Send" → PDF created, status="sent"
              │         │
              │         ▼
              ├──► Monitor Documents
              │    /admin/documents
              │    Track: sent → viewed → signed
              │    Click any doc → See full audit trail
              │         │
              │         ▼
              ├──► Review Verifications (P1)
              │    /admin/users
              │    See pending verifications
              │    View ID document → Approve / Reject
              │         │
              │         ▼
              ├──► Complete Documents
              │    Mark signed docs as "completed"
              │    Final status in lifecycle
              │         │
              │         ▼
              └──► Audit Logs
                   /admin/audit-logs
                   Full trail: who did what, when, from where
                   Filters: action, user, date range
```

### 6.6 Full Document Lifecycle Flow (Simplified)

```
    Admin Creates Template
              │
              ▼
    Admin Generates Document from Template
    (fills placeholders, assigns to user)
              │
              ▼
    Document Status: DRAFT → SENT
    Email notification to user (P1)
              │
              ▼
    User Logs In → Views Dashboard
    "1 document awaiting action"
              │
              ▼
    User Opens Document (PDF preview)
    Document Status: SENT → VIEWED
              │
              ▼
    User Verifies Identity (if required, P1)
    Upload ID → OTP → Verified
              │
              ▼
    User Signs Document (canvas signature)
    Draw → Review → Confirm
    Document Status: VIEWED → SIGNED
              │
              ▼
    Admin Reviews & Marks Complete
    Document Status: SIGNED → COMPLETED
              │
              ▼
    Signed PDF Stored in Azure Blob Storage
    (encrypted at rest, accessible via SAS URLs)
              │
              ▼
    Full Audit Trail Preserved
    (6 entries: created → sent → viewed → verified → signed → completed)
              │
              ▼
    ✓ PLATFORM GOAL ACHIEVED
    Digital document securely created, verified, signed, and stored
```

---

## Appendix: UX Principles Applied

| Principle | How It's Applied |
|---|---|
| **Minimal Clicks** | Registration to dashboard: 1 form + 1 click. Signing: 3 clicks (Sign → Review → Confirm). |
| **Progressive Disclosure** | Verification only shown when required. Admin features hidden from users. |
| **Clear Feedback** | Every action shows a toast notification. Status badges use intuitive colors. |
| **Error Recovery** | OTP can be resent. Signature can be cleared and redrawn. Login errors are generic (security). |
| **Consistent Navigation** | Top navbar for public, sidebar for admin, tab-based for user pages. |
| **Status Visibility** | Document status timeline on every detail page. Dashboard shows counts by status. |
| **Mobile-Responsive** | Signature canvas works with touch. PDF viewer scrollable. Forms single-column on mobile. |
| **Trust Signals** | Confirmation modal before signing. "This action is permanent" warning. Verified badge on profile. |
| **Performance Perception** | Loading spinners during PDF generation. Optimistic UI updates on status changes. |
| **Accessibility** | Color + text for status (not color alone). Labels on all form fields. Keyboard-navigable. |
