# System Architecture Design

## Digital Documentation & Identity Verification System

**Version:** 1.0 (Hackathon MVP)
**Date:** March 6, 2026
**References:** PRD v1.0, Feature List v1.0, TRD v1.0

---

## 1. High-Level Architecture

The system uses a **three-tier client-server architecture** with a clear separation between presentation, application logic, and data persistence. The frontend and backend are fully decoupled — they are developed, deployed, and scaled independently.

### Architecture Style

| Tier | Responsibility | Technology |
|---|---|---|
| **Presentation Tier** | User interface, client-side routing, form handling, signature capture | React.js SPA |
| **Application Tier** | REST API, business logic, authentication, PDF generation, file orchestration | Node.js + Express.js |
| **Data Tier** | Persistent storage for structured data and binary assets | MongoDB Atlas + Azure Blob Storage |

### How the Tiers Interact

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                        PRESENTATION TIER                                  │
│                                                                           │
│   User Browser (Desktop / Mobile)                                        │
│   ┌───────────────────────────────────────────────────────────────┐      │
│   │                  React.js SPA (Vite + Tailwind)               │      │
│   │                                                               │      │
│   │   Renders UI ─── Captures input ─── Manages auth state       │      │
│   │   Previews PDFs ─── Captures signatures ─── Shows dashboards │      │
│   └───────────────────────────┬───────────────────────────────────┘      │
│                               │                                          │
│                               │ HTTPS (REST API calls via Axios)         │
│                               │ Authorization: Bearer <JWT>              │
│                               │                                          │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                               │                                          │
│                        APPLICATION TIER                                   │
│                                                                           │
│   ┌───────────────────────────▼───────────────────────────────────┐      │
│   │              Node.js + Express.js API Server                  │      │
│   │                                                               │      │
│   │   Validates requests ─── Enforces RBAC ─── Runs business logic│      │
│   │   Generates PDFs ─── Orchestrates file uploads ─── Logs audits│      │
│   └─────┬──────────────────────┬─────────────────────┬────────────┘      │
│         │                      │                     │                    │
└─────────┼──────────────────────┼─────────────────────┼────────────────────┘
          │                      │                     │
┌─────────┼──────────────────────┼─────────────────────┼────────────────────┐
│         │               DATA TIER                    │                    │
│         │                      │                     │                    │
│   ┌─────▼──────────┐   ┌──────▼──────────┐   ┌──────▼──────────┐        │
│   │  MongoDB Atlas  │   │  Azure Blob    │   │   SMTP / Email  │        │
│   │                │   │  Storage       │   │                 │        │
│   │  Structured    │   │  Binary assets  │   │  Transactional  │        │
│   │  data (JSON    │   │  (PDFs, images, │   │  emails (OTP,   │        │
│   │  documents)    │   │  signatures)    │   │  notifications) │        │
│   └────────────────┘   └─────────────────┘   └─────────────────┘        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Interaction Rules:**

1. The **frontend never talks to the database or storage directly**. Every operation goes through the API server.
2. The **API server is stateless**. Authentication state lives in JWTs carried by the client. Any server instance can handle any request.
3. **File downloads bypass the API server** — the server generates a time-limited SAS (Shared Access Signature) URL, and the browser fetches the file directly from Azure Blob Storage. This keeps the server lean.
4. **All external service communication** (storage, email) happens server-side only. Credentials are never exposed to the client.

---

## 2. Component Architecture

### 2.1 Component Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM COMPONENTS                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                     CLIENT (Frontend)                           │     │
│  │                                                                 │     │
│  │  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐    │     │
│  │  │  Auth    │ │ Document  │ │ Signature │ │    Admin     │    │     │
│  │  │  Module  │ │  Module   │ │  Module   │ │   Module     │    │     │
│  │  │          │ │           │ │           │ │              │    │     │
│  │  │- Login   │ │- List     │ │- Canvas   │ │- Dashboard   │    │     │
│  │  │- Register│ │- Preview  │ │- Type sig │ │- User mgmt   │    │     │
│  │  │- Profile │ │- Download │ │- Submit   │ │- Templates   │    │     │
│  │  └──────────┘ └───────────┘ └───────────┘ └──────────────┘    │     │
│  │  ┌──────────┐ ┌───────────┐                                    │     │
│  │  │  Shared  │ │   API     │                                    │     │
│  │  │  UI Kit  │ │  Service  │ ◄── Axios instance with           │     │
│  │  │          │ │  Layer    │     JWT interceptors               │     │
│  │  └──────────┘ └───────────┘                                    │     │
│  └─────────────────────────────────┬───────────────────────────────┘     │
│                                    │                                     │
│                            REST API (HTTPS)                              │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐     │
│  │                   API SERVER (Backend)                           │     │
│  │                                                                 │     │
│  │  ┌──────────────────── MIDDLEWARE PIPELINE ──────────────────┐  │     │
│  │  │  CORS → Rate Limiter → Body Parser → Auth → RBAC → Route │  │     │
│  │  └──────────────────────────────────────────────────────────┘  │     │
│  │                                                                 │     │
│  │  ┌───────────────── ROUTE LAYER (Controllers) ───────────────┐ │     │
│  │  │  authRoutes │ templateRoutes │ documentRoutes │ adminRoutes│ │     │
│  │  │             │ signatureRoutes│ verifyRoutes   │            │ │     │
│  │  └──────────────────────────┬────────────────────────────────┘ │     │
│  │                             │                                   │     │
│  │  ┌──────────────── SERVICE LAYER (Business Logic) ───────────┐ │     │
│  │  │  authService │ templateService │ pdfService │ auditService│ │     │
│  │  │  cloudService│ otpService      │ emailService             │ │     │
│  │  └──────────────────────────┬────────────────────────────────┘ │     │
│  │                             │                                   │     │
│  │  ┌──────────────── DATA ACCESS LAYER (Models) ───────────────┐ │     │
│  │  │  User │ Template │ Document │ Signature │ Verification    │ │     │
│  │  │  AuditLog                                                 │ │     │
│  │  └──────────────────────────┬────────────────────────────────┘ │     │
│  └─────────────────────────────┼───────────────────────────────────┘     │
│                                │                                         │
│  ┌─────────────────────────────┼───────────────────────────────────┐     │
│  │                    EXTERNAL SERVICES                             │     │
│  │                             │                                   │     │
│  │  ┌─────────────┐  ┌────────▼────┐  ┌─────────────┐            │     │
│  │  │  MongoDB    │  │ Azure Blob  │  │  Nodemailer  │            │     │
│  │  │  Atlas      │  │  Storage    │  │  + SMTP      │            │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities & Interactions

| Component | Responsibility | Talks To |
|---|---|---|
| **Client (Frontend)** | Renders UI, captures user input (forms, signatures), manages auth state, previews documents, provides admin views | API Server only (via Axios over HTTPS) |
| **API Server** | Validates requests, authenticates/authorizes users, executes business logic, orchestrates data flow between DB and storage, generates PDFs | MongoDB, Azure Blob Storage, SMTP, Client |
| **MongoDB Atlas** | Stores all structured data: users, templates, documents, signatures, verifications, audit logs | API Server only (via Mongoose ODM) |
| **Azure Blob Storage** | Stores all binary files: generated PDFs, signed PDFs, signature images, uploaded ID documents | API Server (upload/delete), Client (download via SAS URLs) |
| **Email Service** | Sends transactional emails: OTP codes, document assignment notifications, signing confirmations | API Server only (via Nodemailer) |

**Interaction Pattern:**

```
Client ──HTTP──► API Server ──Mongoose──► MongoDB
                     │
                     ├──SDK──► Azure Blob Storage (upload)
                     │
                     ├──SMTP──► Email Service
                     │
                     └──SAS URL──► Client ──HTTPS──► Azure Blob Storage (download)
```

The client never holds database credentials or storage API keys. The server acts as a secure gateway for all data operations.

---

## 3. Frontend Architecture

### 3.1 Framework & Libraries

| Concern | Library | Why |
|---|---|---|
| **UI Framework** | React.js 18+ (Vite) | Fast build tooling, component model, hooks |
| **Styling** | Tailwind CSS 3+ | Utility classes eliminate context-switching to CSS files |
| **Routing** | React Router v6 | Declarative routing with layout nesting and route guards |
| **HTTP** | Axios | Request/response interceptors for JWT auto-attach and refresh |
| **Forms** | React Hook Form + Zod | Performant forms with schema-based validation |
| **Signature** | signature_pad | Battle-tested canvas signature library |
| **PDF Preview** | react-pdf | Renders PDFs in-browser for review before signing |
| **Toasts** | React Hot Toast | Non-blocking user feedback |
| **Charts (P1)** | Recharts | Composable chart components for dashboard analytics |
| **Icons** | Lucide React | Lightweight, consistent icon set |

### 3.2 Routing Architecture

```
App.jsx
│
├── <AuthProvider>                          ── Global auth context wraps everything
│   │
│   ├── / ─────────────────────────────── <LandingPage />          (Public)
│   ├── /login ────────────────────────── <LoginPage />            (Public)
│   ├── /register ─────────────────────── <RegisterPage />         (Public)
│   │
│   ├── <ProtectedRoute>                  ── Requires JWT (any role)
│   │   ├── /dashboard ────────────────── <UserDashboard />        (User)
│   │   ├── /documents ────────────────── <DocumentList />         (User)
│   │   ├── /documents/:id ────────────── <DocumentView />         (User)
│   │   ├── /documents/:id/sign ───────── <SignDocument />         (User)
│   │   ├── /verification ─────────────── <VerificationPage />     (User, P1)
│   │   └── /profile ──────────────────── <ProfilePage />          (User)
│   │
│   ├── <AdminRoute>                      ── Requires JWT + role=admin
│   │   ├── /admin/dashboard ──────────── <AdminDashboard />
│   │   ├── /admin/templates ──────────── <TemplateList />
│   │   ├── /admin/templates/new ──────── <TemplateCreate />
│   │   ├── /admin/templates/:id/edit ─── <TemplateEdit />
│   │   ├── /admin/documents ──────────── <AdminDocumentList />
│   │   ├── /admin/documents/generate ─── <DocumentGenerate />
│   │   ├── /admin/users ──────────────── <UserManagement />
│   │   ├── /admin/audit-logs ─────────── <AuditLogs />
│   │   └── /admin/analytics ──────────── <Analytics />            (P1)
│   │
│   └── * ─────────────────────────────── <NotFound />
```

**Route Guards:**

```
<ProtectedRoute>
├── Reads JWT from AuthContext
├── If no token → redirect to /login
├── If token expired → attempt silent refresh via /auth/refresh
├── If refresh fails → clear state, redirect to /login
└── If valid → render child route

<AdminRoute> extends <ProtectedRoute>
├── All ProtectedRoute checks +
├── If user.role !== "admin" → redirect to /dashboard
└── If admin → render child route
```

### 3.3 State Management

```
┌──────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              GLOBAL STATE (React Context)              │  │
│  │                                                        │  │
│  │  AuthContext                                           │  │
│  │  ├── user: { id, name, email, role }                  │  │
│  │  ├── accessToken: string                              │  │
│  │  ├── isAuthenticated: boolean                         │  │
│  │  ├── isLoading: boolean                               │  │
│  │  ├── login(email, password): void                     │  │
│  │  ├── register(name, email, password): void            │  │
│  │  ├── logout(): void                                   │  │
│  │  └── refreshToken(): void                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           LOCAL STATE (Component-level)                │  │
│  │                                                        │  │
│  │  Each page manages its own data:                      │  │
│  │  ├── DocumentList → documents[], pagination, filters  │  │
│  │  ├── DocumentView → document, loading, error          │  │
│  │  ├── SignDocument → signatureData, isSubmitting        │  │
│  │  ├── AdminDashboard → stats, recentActivity           │  │
│  │  └── TemplateCreate → formState, placeholders[]       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          SERVER STATE (Fetched via Axios)              │  │
│  │                                                        │  │
│  │  Fetched on mount (useEffect) per page:               │  │
│  │  ├── GET /documents → DocumentList                    │  │
│  │  ├── GET /documents/:id → DocumentView                │  │
│  │  ├── GET /admin/dashboard/stats → AdminDashboard      │  │
│  │  └── GET /templates → TemplateList                    │  │
│  │                                                        │  │
│  │  No Redux / TanStack Query for MVP — plain            │  │
│  │  useEffect + useState keeps it simple.                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Why Context API over Redux/Zustand:** Only auth state is truly global. All other state is page-scoped. Adding a state management library would be unnecessary complexity for the MVP.

### 3.4 UI Component Structure

```
src/
├── components/
│   ├── common/                        ── Shared, reusable UI atoms
│   │   ├── Button.jsx                 ── Primary, secondary, danger variants
│   │   ├── Input.jsx                  ── Text input with label + error state
│   │   ├── Modal.jsx                  ── Overlay modal wrapper
│   │   ├── Table.jsx                  ── Data table with sortable headers
│   │   ├── StatusBadge.jsx            ── Colored badge (draft, sent, signed...)
│   │   ├── Loader.jsx                 ── Spinner / skeleton
│   │   ├── EmptyState.jsx             ── "No documents yet" placeholder
│   │   └── Pagination.jsx             ── Page controls
│   │
│   ├── layout/                        ── Page structure
│   │   ├── Navbar.jsx                 ── Top nav with auth-aware links
│   │   ├── Sidebar.jsx                ── Admin sidebar navigation
│   │   ├── AppLayout.jsx              ── Navbar + main content area (user)
│   │   └── AdminLayout.jsx            ── Sidebar + header + content (admin)
│   │
│   ├── auth/                          ── Auth-specific components
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── AdminRoute.jsx
│   │
│   ├── documents/                     ── Document feature components
│   │   ├── DocumentCard.jsx           ── Document summary card in list
│   │   ├── DocumentViewer.jsx         ── PDF preview (react-pdf)
│   │   ├── DocumentStatusTimeline.jsx ── Visual status progression
│   │   └── DocumentFilters.jsx        ── Status + date filter bar
│   │
│   ├── signature/                     ── E-signature components
│   │   ├── SignaturePad.jsx           ── Canvas wrapper (signature_pad)
│   │   ├── SignaturePreview.jsx       ── Preview before confirm
│   │   └── SignatureConfirmModal.jsx  ── "Are you sure?" modal
│   │
│   └── admin/                         ── Admin-only components
│       ├── StatsCard.jsx              ── Metric card (total, pending, etc.)
│       ├── ActivityFeed.jsx           ── Recent audit log entries
│       ├── TemplateForm.jsx           ── Create/edit template form
│       ├── PlaceholderEditor.jsx      ── Add/remove {{placeholders}}
│       ├── UserTable.jsx              ── User list with roles + status
│       └── GenerateDocumentForm.jsx   ── Template select + fill values + assign
│
├── pages/                             ── Route-level page components
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── UserDashboard.jsx
│   ├── DocumentListPage.jsx
│   ├── DocumentViewPage.jsx
│   ├── SignDocumentPage.jsx
│   ├── AdminDashboardPage.jsx
│   ├── TemplateListPage.jsx
│   ├── TemplateCreatePage.jsx
│   ├── DocumentGeneratePage.jsx
│   ├── UserManagementPage.jsx
│   └── AuditLogPage.jsx
│
├── services/                          ── API communication layer
│   ├── api.js                         ── Axios instance + interceptors
│   ├── authService.js                 ── login, register, refresh, logout
│   ├── templateService.js             ── CRUD templates
│   ├── documentService.js             ── generate, list, getById, download
│   ├── signatureService.js            ── submit signature
│   └── adminService.js                ── stats, users, audit logs
│
├── context/
│   └── AuthContext.jsx                ── Auth provider + hook
│
├── hooks/
│   ├── useAuth.js                     ── Shortcut to AuthContext
│   └── useFetch.js                    ── Generic data fetching hook
│
├── utils/
│   ├── constants.js                   ── Status enums, role enums
│   └── formatters.js                  ── Date formatting, status labels
│
└── App.jsx                            ── Root component with router
```

### 3.5 API Communication Layer

```javascript
// services/api.js — Central Axios instance

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // e.g., http://localhost:5000/api/v1
  headers: { 'Content-Type': 'application/json' }
});

// REQUEST interceptor — attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE interceptor — handle 401 with silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

```
Request Flow:
                                                     ┌──────────────┐
  Component        Service Layer       Axios         │  API Server  │
  ─────────        ─────────────       ─────         │              │
      │                 │                │            │              │
      │  call service   │                │            │              │
      │────────────────►│  api.get(url)  │            │              │
      │                 │───────────────►│   HTTP     │              │
      │                 │                │───────────►│              │
      │                 │                │            │  Process     │
      │                 │                │   JSON     │              │
      │                 │                │◄───────────│              │
      │                 │  response.data │            │              │
      │  { data }       │◄───────────────│            │              │
      │◄────────────────│                │            │              │
      │  setState(data) │                │            └──────────────┘
      │                 │                │
```

---

## 4. Backend Architecture

### 4.1 Layered Architecture

The backend follows a **three-layer architecture** within the Express server: Routes → Controllers → Services → Models. Each layer has a single responsibility, and dependencies flow strictly downward.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS APPLICATION                                  │
│                                                                         │
│  server.js (Entry Point)                                                │
│  ├── Load environment variables (dotenv)                                │
│  ├── Connect to MongoDB (mongoose)                                      │
│  ├── Initialize Express app                                             │
│  ├── Mount global middleware                                            │
│  ├── Mount route modules                                                │
│  └── Start HTTP server                                                  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE PIPELINE                             │  │
│  │                                                                   │  │
│  │  Incoming Request                                                 │  │
│  │       │                                                           │  │
│  │       ▼                                                           │  │
│  │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │  CORS   │→│  Rate     │→│  Body    │→│  Morgan │→│ Routes │ │  │
│  │  │         │ │  Limiter  │ │  Parser  │ │ (Logger)│ │        │ │  │
│  │  └─────────┘ └───────────┘ └──────────┘ └─────────┘ └────┬───┘ │  │
│  │                                                           │      │  │
│  │  Per-route middleware (applied on specific routes):       │      │  │
│  │  ┌────────────────┐ ┌──────────────┐ ┌────────────────┐  │      │  │
│  │  │ verifyToken()  │ │requireAdmin()│ │ multerUpload() │  │      │  │
│  │  │ (JWT check)    │ │(role guard)  │ │ (file parsing) │  │      │  │
│  │  └────────────────┘ └──────────────┘ └────────────────┘  │      │  │
│  └──────────────────────────────────────────────────────────┘      │  │
│                                                                     │  │
│  ┌───────────────────── ROUTE / CONTROLLER LAYER ─────────────────┐│  │
│  │                                                                 ││  │
│  │  Receives validated request → calls service → returns response  ││  │
│  │                                                                 ││  │
│  │  authRoutes.js      → authController.js                        ││  │
│  │  templateRoutes.js  → templateController.js                    ││  │
│  │  documentRoutes.js  → documentController.js                    ││  │
│  │  signatureRoutes.js → signatureController.js                   ││  │
│  │  verifyRoutes.js    → verificationController.js    (P1)        ││  │
│  │  adminRoutes.js     → adminController.js                       ││  │
│  └─────────────────────────────┬───────────────────────────────────┘│  │
│                                │                                    │  │
│  ┌─────────────────── SERVICE LAYER (Business Logic) ─────────────┐│  │
│  │                             │                                   ││  │
│  │  Pure business logic — no req/res objects, no HTTP awareness    ││  │
│  │                                                                 ││  │
│  │  authService         ── register, login, token management       ││  │
│  │  templateService     ── CRUD, placeholder parsing               ││  │
│  │  documentService     ── generate, assign, status transitions    ││  │
│  │  pdfService          ── PDF creation, signature embedding       ││  │
│  │  signatureService    ── capture, store, link to document        ││  │
│  │  cloudService        ── upload, download URL, delete            ││  │
│  │  auditService        ── log actions with context                ││  │
│  │  emailService        ── send OTP, notifications (P1)           ││  │
│  │  otpService          ── generate, hash, verify (P1)            ││  │
│  └─────────────────────────────┬───────────────────────────────────┘│  │
│                                │                                    │  │
│  ┌─────────────────── DATA ACCESS LAYER (Mongoose Models) ────────┐│  │
│  │                             │                                   ││  │
│  │  User.js ─── Template.js ─── Document.js                      ││  │
│  │  Signature.js ─── Verification.js ─── AuditLog.js             ││  │
│  │                                                                 ││  │
│  │  Each model defines: schema, validations, indexes, methods     ││  │
│  └─────────────────────────────┬───────────────────────────────────┘│  │
│                                │                                    │  │
└────────────────────────────────┼────────────────────────────────────┘  │
                                 │                                       │
                    ┌────────────▼────────────┐                          │
                    │   MongoDB Atlas          │                          │
                    │   Azure Blob Storage     │                          │
                    │   SMTP Server            │                          │
                    └─────────────────────────┘                          │
```

### 4.2 Backend Directory Structure

```
server/
├── config/
│   ├── db.js                  ── MongoDB connection (mongoose.connect)
│   ├── azureStorage.js        ── Azure Blob Storage SDK config
│   └── env.js                 ── Environment variable loader + validation
│
├── middleware/
│   ├── auth.js                ── verifyToken, requireAdmin, requireUser
│   ├── upload.js              ── Multer config (file types, size limits)
│   ├── validate.js            ── Generic Zod schema validation middleware
│   ├── errorHandler.js        ── Global error handler (catches all throws)
│   └── rateLimiter.js         ── express-rate-limit configs
│
├── models/
│   ├── User.js
│   ├── Template.js
│   ├── Document.js
│   ├── Signature.js
│   ├── Verification.js        (P1)
│   └── AuditLog.js
│
├── routes/
│   ├── authRoutes.js
│   ├── templateRoutes.js
│   ├── documentRoutes.js
│   ├── signatureRoutes.js
│   ├── verificationRoutes.js  (P1)
│   └── adminRoutes.js
│
├── controllers/
│   ├── authController.js
│   ├── templateController.js
│   ├── documentController.js
│   ├── signatureController.js
│   ├── verificationController.js  (P1)
│   └── adminController.js
│
├── services/
│   ├── authService.js
│   ├── templateService.js
│   ├── documentService.js
│   ├── pdfService.js
│   ├── signatureService.js
│   ├── cloudService.js
│   ├── auditService.js
│   ├── emailService.js        (P1)
│   └── otpService.js          (P1)
│
├── utils/
│   ├── ApiResponse.js         ── Standardized response helper
│   ├── ApiError.js            ── Custom error class with status codes
│   └── logger.js              ── Winston logger config
│
├── validators/
│   ├── authValidators.js      ── Zod schemas for register, login
│   ├── templateValidators.js
│   └── documentValidators.js
│
├── .env
├── server.js                  ── Entry point
└── package.json
```

### 4.3 Request Lifecycle (Example: Sign a Document)

```
POST /api/v1/documents/:id/sign
│
▼
┌─────────────────────────── MIDDLEWARE ──────────────────────────────┐
│ cors() → rateLimiter() → express.json() → morgan()                │
│ → verifyToken() [extracts & validates JWT, attaches req.user]      │
│ → requireUser() [ensures role === 'user']                          │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────── CONTROLLER LAYER ────────────────────────────┐
│ signatureController.sign(req, res)                                 │
│ ├── Extract documentId from req.params                             │
│ ├── Extract signatureImage from req.body                           │
│ ├── Validate input (Zod schema)                                    │
│ ├── Call signatureService.signDocument(documentId, userId, data)    │
│ └── Return ApiResponse.success(res, 200, result)                   │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────── SERVICE LAYER ──────────────────────────────┐
│ signatureService.signDocument(documentId, userId, signatureData)    │
│ ├── Fetch document from DB → verify status === 'sent' or 'viewed'  │
│ ├── Verify document.assignedTo === userId (ownership check)         │
│ ├── cloudService.upload(signatureImage) → signatureUrl              │
│ ├── pdfService.embedSignature(document.pdfUrl, signatureUrl)        │
│ │   └── Downloads PDF → embeds signature PNG → upload new PDF       │
│ ├── Create Signature record in DB                                   │
│ ├── Update document.status = 'signed'                               │
│ ├── auditService.log('signed', documentId, userId)                  │
│ └── Return { document, signature, signedPdfUrl }                    │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────── DATA ACCESS LAYER ─────────────────────────────┐
│ Document.findById() → Signature.create() → Document.findByIdAnd   │
│ Update() → AuditLog.create()                                       │
│                                                                    │
│ cloudService → Azure Blob Storage SDK → upload/download            │
└────────────────────────────────────────────────────────────────────┘
```

### 4.4 Authentication Middleware Detail

```
verifyToken(req, res, next)
│
├── 1. Extract token from Authorization header
│      const token = req.headers.authorization?.split(' ')[1]
│      if (!token) → 401 "Access token required"
│
├── 2. Verify JWT
│      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET)
│      if (invalid/expired) → 401 "Invalid or expired token"
│
├── 3. Fetch user from DB (ensure they still exist)
│      const user = await User.findById(decoded.userId).select('-password')
│      if (!user) → 401 "User no longer exists"
│
├── 4. Attach user to request
│      req.user = user
│
└── 5. next()


requireAdmin(req, res, next)
│
├── Runs AFTER verifyToken
├── if (req.user.role !== 'admin') → 403 "Admin access required"
└── next()
```

### 4.5 File Upload Handling

```
┌──────────────────── FILE UPLOAD PIPELINE ──────────────────────────┐
│                                                                    │
│  Client                                                            │
│  ├── <input type="file"> or Canvas.toDataURL()                    │
│  ├── FormData or JSON with base64                                 │
│  └── POST to /api/v1/...                                          │
│                                                                    │
│  Multer Middleware (server/middleware/upload.js)                    │
│  ├── memoryStorage() — files held in buffer, not written to disk  │
│  ├── fileFilter: only accept PDF, JPEG, PNG                       │
│  ├── limits: { fileSize: 10 * 1024 * 1024 }  (10 MB)            │
│  └── Attaches req.file (single) or req.files (multiple)           │
│                                                                    │
│  Controller                                                        │
│  ├── Receives req.file.buffer                                     │
│  └── Passes buffer to cloudService.upload()                       │
│                                                                    │
│  cloudService.upload(buffer, containerName, blobName)              │
│  ├── Azure: blockBlobClient.uploadData(buffer)                    │
│  │   Uses @azure/storage-blob SDK                                 │
│  ├── Returns { url, blobName }                                    │
│  └── URL stored in database record                                │
│                                                                    │
│  Download Flow (does NOT go through Express):                      │
│  ├── Controller calls cloudService.getSasUrl(blobName)            │
│  ├── Returns time-limited SAS URL (15 min) to client              │
│  └── Client browser fetches file directly from Azure Blob Storage │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Why memory storage over disk storage:** Files are uploaded to the cloud immediately and never persisted on the server. This keeps the server stateless (critical for horizontal scaling on platforms like Render) and avoids disk cleanup concerns.

---

## 5. Data Flow

### 5.1 User Registration & Authentication

```
┌──────────┐                    ┌──────────────┐                ┌──────────┐
│  Browser  │                    │  API Server   │                │ MongoDB  │
└─────┬────┘                    └──────┬───────┘                └────┬─────┘
      │                                │                             │
      │  1. POST /auth/register        │                             │
      │  { name, email, password }     │                             │
      │───────────────────────────────►│                             │
      │                                │  2. Validate input (Zod)    │
      │                                │  3. Check duplicate email   │
      │                                │────────────────────────────►│
      │                                │◄────────────────────────────│
      │                                │  4. Hash password (bcrypt)  │
      │                                │  5. Create user doc         │
      │                                │────────────────────────────►│
      │                                │◄────────────────────────────│
      │                                │  6. Sign JWT (access+refresh)│
      │                                │  7. Store hashed refresh    │
      │                                │     token in user doc       │
      │                                │────────────────────────────►│
      │  8. 201 { user, tokens }       │                             │
      │◄───────────────────────────────│                             │
      │                                │                             │
      │  9. Store accessToken          │                             │
      │     (localStorage)             │                             │
      │  10. Redirect to dashboard     │                             │
      │                                │                             │

  ── SUBSEQUENT AUTHENTICATED REQUEST ──

      │  11. GET /documents            │                             │
      │  Authorization: Bearer <token> │                             │
      │───────────────────────────────►│                             │
      │                                │  12. verifyToken middleware │
      │                                │      jwt.verify(token)      │
      │                                │  13. Attach req.user        │
      │                                │  14. Query by assignedTo    │
      │                                │────────────────────────────►│
      │                                │◄────────────────────────────│
      │  15. 200 { documents[] }       │                             │
      │◄───────────────────────────────│                             │
```

---

### 5.2 Identity Verification — Document Upload (P1)

```
┌──────────┐            ┌──────────────┐        ┌──────────┐  ┌───────────┐
│  Browser  │            │  API Server   │        │ MongoDB  │  │Azure Blob │
└─────┬────┘            └──────┬───────┘        └────┬─────┘  └─────┬─────┘
      │                        │                     │              │
      │  1. POST /verification/upload-id             │              │
      │  FormData: { idDocument: File,               │              │
      │              documentType: "aadhaar" }        │              │
      │───────────────────────►│                     │              │
      │                        │ 2. verifyToken      │              │
      │                        │ 3. Multer parses    │              │
      │                        │    file (buffer)    │              │
      │                        │ 4. Validate type    │              │
      │                        │    + size ≤ 5MB     │              │
      │                        │                     │              │
      │                        │ 5. Upload buffer    │              │
      │                        │    to cloud         │              │
      │                        │─────────────────────┼─────────────►│
      │                        │                     │    6. Store  │
      │                        │◄────────────────────┼──────────────│
      │                        │    { url }          │              │
      │                        │                     │              │
      │                        │ 7. Create           │              │
      │                        │    Verification doc │              │
      │                        │────────────────────►│              │
      │                        │◄────────────────────│              │
      │                        │                     │              │
      │  8. 200 { status:      │                     │              │
      │     "pending" }        │                     │              │
      │◄───────────────────────│                     │              │
      │                        │                     │              │

  ── OTP VERIFICATION ──

      │  9. POST /verification/send-otp              │              │
      │───────────────────────►│                     │              │
      │                        │ 10. Generate 6-digit OTP           │
      │                        │ 11. Hash OTP, store with expiry    │
      │                        │────────────────────►│              │
      │                        │ 12. Send OTP via email ───────► SMTP
      │  13. 200 "OTP sent"    │                     │              │
      │◄───────────────────────│                     │              │
      │                        │                     │              │
      │  14. POST /verification/verify-otp           │              │
      │  { otp: "482917" }     │                     │              │
      │───────────────────────►│                     │              │
      │                        │ 15. Fetch verification record      │
      │                        │────────────────────►│              │
      │                        │◄────────────────────│              │
      │                        │ 16. Compare hashed OTP             │
      │                        │ 17. Check expiry                   │
      │                        │ 18. Update status → "verified"     │
      │                        │────────────────────►│              │
      │  19. 200 { status:     │                     │              │
      │     "verified" }       │                     │              │
      │◄───────────────────────│                     │              │
```

---

### 5.3 Agreement Generation

```
┌──────────┐            ┌──────────────┐        ┌──────────┐  ┌───────────┐
│  Admin    │            │  API Server   │        │ MongoDB  │  │Azure Blob │
│  Browser  │            │              │        │          │  │           │
└─────┬────┘            └──────┬───────┘        └────┬─────┘  └─────┬─────┘
      │                        │                     │              │
      │  1. POST /documents/generate                 │              │
      │  { templateId,         │                     │              │
      │    assignedTo,         │                     │              │
      │    title,              │                     │              │
      │    values: {           │                     │              │
      │      employee_name,    │                     │              │
      │      designation,...   │                     │              │
      │    }}                  │                     │              │
      │───────────────────────►│                     │              │
      │                        │ 2. verifyToken +    │              │
      │                        │    requireAdmin     │              │
      │                        │                     │              │
      │                        │ 3. Fetch template   │              │
      │                        │────────────────────►│              │
      │                        │◄────────────────────│              │
      │                        │                     │              │
      │                        │ 4. Replace placeholders             │
      │                        │    "Dear {{employee_name}}"         │
      │                        │    → "Dear Rahul Sharma"            │
      │                        │                     │              │
      │                        │ 5. Generate PDF     │              │
      │                        │    (pdf-lib: create │              │
      │                        │     pages, add text)│              │
      │                        │                     │              │
      │                        │ 6. Upload PDF       │              │
      │                        │─────────────────────┼─────────────►│
      │                        │◄────────────────────┼──────────────│
      │                        │    { pdfUrl }       │              │
      │                        │                     │              │
      │                        │ 7. Create Document record           │
      │                        │    status: "sent"   │              │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │                        │ 8. Log audit:       │              │
      │                        │    "created" + "sent"│             │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │                        │ 9. (P1) Send email notification    │
      │                        │    to assigned user ────────► SMTP │
      │                        │                     │              │
      │  10. 201 { document }  │                     │              │
      │◄───────────────────────│                     │              │
```

---

### 5.4 Digital Signature Submission

```
┌──────────┐            ┌──────────────┐        ┌──────────┐  ┌───────────┐
│  User     │            │  API Server   │        │ MongoDB  │  │Azure Blob │
│  Browser  │            │              │        │          │  │           │
└─────┬────┘            └──────┬───────┘        └────┬─────┘  └─────┬─────┘
      │                        │                     │              │
      │  1. User views doc     │                     │              │
      │  GET /documents/:id    │                     │              │
      │───────────────────────►│                     │              │
      │                        │ 2. Fetch document   │              │
      │                        │────────────────────►│              │
      │                        │ 3. Update status    │              │
      │                        │    → "viewed"       │              │
      │                        │────────────────────►│              │
      │  4. { document + PDF   │                     │              │
      │     preview URL }      │                     │              │
      │◄───────────────────────│                     │              │
      │                        │                     │              │
      │  5. User reads document│                     │              │
      │     in PDF viewer      │                     │              │
      │                        │                     │              │
      │  6. User draws signature                     │              │
      │     on canvas (signature_pad)                │              │
      │                        │                     │              │
      │  7. POST /documents/:id/sign                 │              │
      │  { signatureImage:     │                     │              │
      │    "data:image/png;    │                     │              │
      │     base64,..." }      │                     │              │
      │───────────────────────►│                     │              │
      │                        │                     │              │
      │                        │ 8. verifyToken +    │              │
      │                        │    verify ownership │              │
      │                        │    (assignedTo ===  │              │
      │                        │     req.user.id)    │              │
      │                        │                     │              │
      │                        │ 9. Decode base64    │              │
      │                        │    → PNG buffer     │              │
      │                        │                     │              │
      │                        │ 10. Upload signature│              │
      │                        │     image to cloud  │              │
      │                        │─────────────────────┼─────────────►│
      │                        │◄────────────────────┼──────────────│
      │                        │   { signatureUrl }  │              │
      │                        │                     │              │
      │                        │ 11. Download original PDF          │
      │                        │─────────────────────┼─────────────►│
      │                        │◄────────────────────┼──────────────│
      │                        │                     │              │
      │                        │ 12. Embed signature │              │
      │                        │     into PDF        │              │
      │                        │     (pdf-lib:       │              │
      │                        │      drawImage +    │              │
      │                        │      add timestamp  │              │
      │                        │      + signer name) │              │
      │                        │                     │              │
      │                        │ 13. Upload signed   │              │
      │                        │     PDF to cloud    │              │
      │                        │─────────────────────┼─────────────►│
      │                        │◄────────────────────┼──────────────│
      │                        │   { signedPdfUrl }  │              │
      │                        │                     │              │
      │                        │ 14. Create Signature│              │
      │                        │     record          │              │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │                        │ 15. Update document │              │
      │                        │     status → "signed"│             │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │                        │ 16. Log audit:      │              │
      │                        │     "signed"        │              │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │  17. 200 { document,   │                     │              │
      │   signedPdfUrl }       │                     │              │
      │◄───────────────────────│                     │              │
      │                        │                     │              │
      │  18. UI shows success  │                     │              │
      │      + download link   │                     │              │
```

---

### 5.5 Document Retrieval & Download

```
┌──────────┐            ┌──────────────┐        ┌──────────┐  ┌───────────┐
│  Browser  │            │  API Server   │        │ MongoDB  │  │Azure Blob │
└─────┬────┘            └──────┬───────┘        └────┬─────┘  └─────┬─────┘
      │                        │                     │              │
      │  1. GET /documents/:id/download              │              │
      │───────────────────────►│                     │              │
      │                        │ 2. verifyToken      │              │
      │                        │ 3. Fetch document   │              │
      │                        │────────────────────►│              │
      │                        │◄────────────────────│              │
      │                        │                     │              │
      │                        │ 4. Check ownership  │              │
      │                        │    (user: own docs  │              │
      │                        │     admin: all docs)│              │
      │                        │                     │              │
      │                        │ 5. Generate signed  │              │
      │                        │    download URL     │              │
      │                        │    (15 min expiry)  │              │
      │                        │─────────────────────┼─────────────►│
      │                        │◄────────────────────┼──────────────│
      │                        │   { signedUrl }     │              │
      │                        │                     │              │
      │                        │ 6. Log audit:       │              │
      │                        │    "downloaded"     │              │
      │                        │────────────────────►│              │
      │                        │                     │              │
      │  7. 200 { downloadUrl }│                     │              │
      │◄───────────────────────│                     │              │
      │                        │                     │              │
      │  8. Browser fetches PDF directly from Azure Blob Storage     │
      │────────────────────────┼─────────────────────┼─────────────►│
      │◄───────────────────────┼─────────────────────┼──────────────│
      │     PDF binary         │                     │              │
      │                        │                     │              │
      │  9. Browser triggers   │                     │              │
      │     file download      │                     │              │
```

**Key point:** The PDF binary never passes through the Express server on download. The server only generates a SAS (Shared Access Signature) URL. The browser fetches the file directly from Azure Blob Storage. This keeps server bandwidth low and response times fast.

---

## 6. External Services

### 6.1 Service Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                              │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  AZURE BLOB      │  │    MONGODB       │  │     SMTP / EMAIL    │  │
│  │  STORAGE          │  │    ATLAS         │  │     SERVICE         │  │
│  │  (File Storage)  │  │    (Database)    │  │                     │  │
│  │                 │  │                 │  │  Purpose:           │  │
│  │  Purpose:       │  │  Purpose:       │  │  Send OTP codes,    │  │
│  │  Store PDFs,    │  │  Store all      │  │  doc notifications, │  │
│  │  signatures,    │  │  structured     │  │  signing alerts     │  │
│  │  ID documents   │  │  data (users,   │  │                     │  │
│  │                 │  │  docs, logs)    │  │  Used by:           │  │
│  │  Used by:       │  │                 │  │  emailService       │  │
│  │  cloudService   │  │  Used by:       │  │  otpService         │  │
│  │                 │  │  All models     │  │                     │  │
│  │  Tier: P0       │  │                 │  │  Tier: P1           │  │
│  │  Cost: Free     │  │  Tier: P0       │  │  Cost: Free         │  │
│  │  (5 GB free)    │  │  Cost: Free (M0)│  │  (Mailtrap / Gmail) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   VERCEL         │  │    RENDER        │  │   signature_pad     │  │
│  │   (Frontend CDN) │  │    (Backend Host)│  │   (Client Library)  │  │
│  │                 │  │                 │  │                     │  │
│  │  Purpose:       │  │  Purpose:       │  │  Purpose:           │  │
│  │  Host React SPA │  │  Host Express   │  │  HTML5 canvas       │  │
│  │  with CDN and   │  │  API with auto- │  │  signature capture  │  │
│  │  auto HTTPS     │  │  deploy + TLS   │  │  in the browser     │  │
│  │                 │  │                 │  │                     │  │
│  │  Tier: P0       │  │  Tier: P0       │  │  Tier: P0           │  │
│  │  Cost: Free     │  │  Cost: Free     │  │  Cost: Free (MIT)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐                           │
│  │   pdf-lib        │  │   TESSERACT.js   │                           │
│  │   (PDF Engine)   │  │   (OCR – Future) │                           │
│  │                 │  │                 │                           │
│  │  Purpose:       │  │  Purpose:       │                           │
│  │  Generate PDFs  │  │  Extract text   │                           │
│  │  from templates,│  │  from uploaded  │                           │
│  │  embed sigs     │  │  ID images      │                           │
│  │                 │  │                 │                           │
│  │  Tier: P0       │  │  Tier: Future   │                           │
│  │  Cost: Free     │  │  Cost: Free     │                           │
│  └─────────────────┘  └─────────────────┘                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Integration Summary

| Service | Type | Protocol | Auth Method | MVP Tier |
|---|---|---|---|---|
| **MongoDB Atlas** | Managed Database | MongoDB Wire Protocol (TLS) | Connection string with credentials | P0 |
| **Azure Blob Storage** | Object Storage | HTTPS REST API | Connection String / SAS Token | P0 |
| **Nodemailer + SMTP** | Email Delivery | SMTP (TLS) | App password / OAuth2 | P1 |
| **Mailtrap** | Email Sandbox (dev) | SMTP | Username + password | P1 (dev only) |
| **Vercel** | Static Hosting + CDN | HTTPS | Git integration (auto-deploy) | P0 |
| **Render** | App Hosting | HTTPS | Git integration (auto-deploy) | P0 |
| **signature_pad** | Client-side Library | N/A (npm package) | N/A | P0 |
| **pdf-lib** | Server-side Library | N/A (npm package) | N/A | P0 |
| **Tesseract.js** | OCR Library | N/A (npm package) | N/A | Future |

### 6.3 Fallback Strategy

| Primary Service | Fallback | Switch Effort |
|---|---|---|
| Azure Blob Storage | AWS S3 / Cloudinary | Swap `cloudService.js` implementation; same interface |
| Nodemailer + Gmail | SendGrid / Mailgun | Swap SMTP config in `emailService.js` |
| MongoDB Atlas | Self-hosted MongoDB (Docker) | Change `MONGO_URI` env variable |
| Vercel | Netlify | Similar config; redirect deploy target |
| Render | Railway / Fly.io | Similar Node.js hosting; re-deploy |

Each external dependency is isolated behind a service layer, so swapping providers requires changing only one file.

---

## 7. Architecture Diagram

### 7.1 Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   USER BROWSER (Desktop / Mobile)                                              │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                         │   │
│   │                    REACT.js SPA (Vite + Tailwind CSS)                   │   │
│   │                                                                         │   │
│   │   ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐     │   │
│   │   │   Auth   │  │ Document  │  │  Signature │  │     Admin      │     │   │
│   │   │   Pages  │  │   Pages   │  │    Pages   │  │   Dashboard    │     │   │
│   │   │          │  │           │  │            │  │    Pages       │     │   │
│   │   │ • Login  │  │ • List    │  │ • Canvas   │  │ • Stats        │     │   │
│   │   │ • Signup │  │ • View    │  │ • Preview  │  │ • Templates    │     │   │
│   │   │ • Profile│  │ • Download│  │ • Confirm  │  │ • Users        │     │   │
│   │   └──────────┘  └───────────┘  └────────────┘  │ • Audit Logs   │     │   │
│   │                                                 └────────────────┘     │   │
│   │   ┌──────────────────────────────────────────────────────────────┐     │   │
│   │   │  Shared: AuthContext │ Axios API Layer │ React Router │ Zod  │     │   │
│   │   └──────────────────────────────────────────────────────────────┘     │   │
│   │                                                                         │   │
│   └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                      │                                          │
│                     HTTPS REST API   │  Authorization: Bearer <JWT>             │
│                     (JSON payloads)  │                                          │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   NODE.js + EXPRESS.js API SERVER                                               │
│                                                                                  │
│   ┌──────────────────────────── MIDDLEWARE ──────────────────────────────────┐   │
│   │  CORS → Rate Limiter → Body Parser → Morgan Logger                      │   │
│   │  → [verifyToken] → [requireAdmin / requireUser] → Route Handler         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌──────────────── ROUTES / CONTROLLERS ───────────────────────────────────┐   │
│   │                                                                         │   │
│   │   /auth/*          /templates/*      /documents/*      /admin/*         │   │
│   │   • register       • create          • generate        • stats          │   │
│   │   • login          • list            • list            • activity       │   │
│   │   • refresh        • update          • getById         • users          │   │
│   │   • logout         • delete          • sign            • audit-logs     │   │
│   │                                      • download                         │   │
│   │                    /verification/*   (P1)                               │   │
│   │                    • upload-id   • send-otp   • verify-otp              │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                                │
│   ┌─────────────── SERVICES (Business Logic) ──────────────────────────────┐   │
│   │                             │                                           │   │
│   │   authService       templateService      documentService               │   │
│   │   pdfService        signatureService     cloudService                  │   │
│   │   auditService      emailService (P1)    otpService (P1)              │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                                │
│   ┌─────────────── MODELS (Mongoose Schemas) ──────────────────────────────┐   │
│   │                             │                                           │   │
│   │   User    Template    Document    Signature    AuditLog    Verification │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                                │
└─────────────────────────────────┼────────────────────────────────────────────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
┌────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    MONGODB ATLAS    │ │  AZURE BLOB       │ │   SMTP / EMAIL   │
│                    │ │  STORAGE           │ │                  │
│  ┌──────────────┐  │ │  ┌────────────┐  │ │  ┌────────────┐ │
│  │ Users        │  │ │  │ documents/ │  │ │  │ OTP Codes  │ │
│  │ Templates    │  │ │  │   *.pdf    │  │ │  │ Doc Assign │ │
│  │ Documents    │  │ │  │            │  │ │  │ Sign Alert │ │
│  │ Signatures   │  │ │  │ signatures/│  │ │  │ Reminders  │ │
│  │ AuditLogs    │  │ │  │   *.png    │  │ │  │            │ │
│  │ Verifications│  │ │  │            │  │ │  │  via:      │ │
│  │              │  │ │  │ ids/       │  │ │  │  Nodemailer│ │
│  │  Encrypted   │  │ │  │   *.jpg    │  │ │  │  + Gmail   │ │
│  │  at rest     │  │ │  │            │  │ │  │  / Mailtrap│ │
│  │  (AES-256)   │  │ │  │  Encrypted │  │ │  │            │ │
│  │              │  │ │  │  (SSE)     │  │ │  │            │ │
│  └──────────────┘  │ │  └────────────┘  │ │  └────────────┘ │
│                    │ │                  │ │                  │
│  Free M0 Cluster   │ │  Free 5 GB       │ │  Free Tier      │
└────────────────────┘ └──────────────────┘ └──────────────────┘
```

### 7.2 Simplified View (Quick Reference)

```
                    ┌─────────────────────┐
                    │    User Browser      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Frontend (React)    │      Hosted on: Vercel
                    │  Tailwind + Vite     │
                    └──────────┬──────────┘
                               │
                         HTTPS / REST API
                         (Bearer JWT)
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Backend (Express)   │      Hosted on: Render
                    │  Node.js API Server  │
                    └──┬──────┬───────┬───┘
                       │      │       │
              ┌────────┘      │       └────────┐
              │               │                │
              ▼               ▼                ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │  MongoDB     │  │  Azure Blob   │  │  SMTP Email  │
    │  Atlas       │  │  Storage      │  │  (Nodemailer)│
    │  (Data)      │  │  (Files)      │  │              │
    └─────────────┘  └──────┬───────┘  └──────────────┘
                            │
                    ┌───────┘
                    │ SAS URL (direct download)
                    ▼
            ┌─────────────────────┐
            │    User Browser      │
            │    (PDF download)    │
            └─────────────────────┘
```

### 7.3 Data Flow Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                     END-TO-END DATA FLOW                            │
│                                                                    │
│  WRITE PATH (Upload / Create):                                     │
│  Browser → Axios → Express → Service → Mongoose → MongoDB         │
│                                  └──→ Azure Blob Storage (files)   │
│                                                                    │
│  READ PATH (View / List):                                          │
│  Browser → Axios → Express → Service → Mongoose → MongoDB         │
│                                                    │               │
│  DOWNLOAD PATH (PDF retrieval):                    │               │
│  Browser → Axios → Express → Azure SDK → SAS URL                  │
│  Browser ────────────────────→ Azure Blob Storage (direct fetch)   │
│                                                                    │
│  NOTIFICATION PATH (Email):                                        │
│  Express → emailService → Nodemailer → SMTP → User inbox          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Architecture Principles Summary

| Principle | Implementation |
|---|---|
| **Separation of Concerns** | Frontend (UI), Backend (API + Logic), Database (Persistence), Storage (Files) are fully decoupled |
| **Stateless Server** | JWT authentication — no server-side sessions. Any instance handles any request |
| **Single Responsibility** | Each service file owns one domain (PDF, cloud, auth). Each model owns one collection |
| **Security by Default** | Auth middleware on all protected routes. RBAC enforced at route level. Files behind SAS URLs |
| **Fail Fast** | Input validated at entry (Zod). Errors caught by global error handler. No silent failures |
| **Minimal External Dependencies** | Only essential services used. Every dependency is swappable via the service layer |
| **Hackathon Pragmatism** | Monolith > microservices. Context API > Redux. Free tiers > paid. Working code > perfect architecture |

---

*This architecture is designed to be built in ~18 hours by a small team while still demonstrating a production-grade structure. Every component is modular — nothing is hard-wired — so the system can evolve cleanly post-hackathon.*
