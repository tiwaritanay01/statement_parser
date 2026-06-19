# Vessify Statement Extraction

## Project Overview
Vessify Extraction is a robust, multi-tenant web application designed to parse raw bank or credit card transaction text into structured data. It automatically extracts critical details such as the transaction date, description, amount, balance, and assigns a deterministic confidence score to the extraction quality.

## Tech Stack
**Frontend:**
- [Next.js 15](https://nextjs.org/) (App Router)
- React 19 & TypeScript
- Tailwind CSS
- [shadcn/ui](https://ui.shadcn.com/) for accessible components
- `better-fetch` for API communication

**Backend:**
- [Hono](https://hono.dev/) (Lightweight, ultra-fast web framework)
- Node.js & TypeScript
- [Prisma ORM](https://www.prisma.io/)
- PostgreSQL
- [Better Auth](https://better-auth.com/) for secure authentication & session management

## Architecture
The repository uses a workspace-like structure, separating the frontend and backend while maintaining clear boundaries. 
- `/` (Root): Contains the Hono backend server, Prisma schema, authentication configuration, unit tests, and the transaction parsing logic.
- `/web`: Contains the Next.js frontend application, built with Tailwind and shadcn/ui.
- `/shared`: Shared TypeScript definitions (DTOs) used by both the frontend client and the backend server to ensure end-to-end type safety.

## Setup Instructions
1. Clone the repository to your local machine.
2. Install backend dependencies from the root directory:
   ```bash
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd web
   npm install
   ```
4. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```

## Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/vessify_db"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-chars"
```

## Run Backend
From the root directory, start the Hono backend development server (runs on port `3000`):
```bash
npm run dev
```

## Run Frontend
In a new terminal window, navigate to the `web` directory and start the Next.js frontend (runs on port `3001`):
```bash
cd web
npm run dev
```

## Run Tests
The backend includes a comprehensive Jest test suite validating parser accuracy and tenant isolation. Run the tests from the root directory:
```bash
npm test
```
*(Note: Tests are configured to run natively with Node's ECMAScript Modules via `--experimental-vm-modules`)*

## API Endpoints
Base URL: `http://localhost:3000`

### Authentication (Better Auth)
- `POST /api/auth/sign-in/email` - Authenticate a user
- `POST /api/auth/sign-up/email` - Register a new user
- `POST /api/auth/sign-out` - End user session
- `GET /api/auth/get-session` - Retrieve active session data

### Transactions
- `POST /api/transactions/extract` 
  - Extracts and saves a transaction from raw text.
  - Body: `{ "text": "Raw statement text here..." }`
- `GET /api/transactions`
  - Retrieves a paginated list of the tenant's parsed transactions.
  - Query Params: `?cursor=<string>&limit=<number>`

## Multi-Tenancy Strategy
The application is designed from the ground up to support B2B SaaS workflows. 
- **Data Model**: A `Tenant` model represents an organization. Users are connected to Tenants via a `TenantMember` join table, natively supporting multi-tenant memberships and Role-Based Access Control (RBAC).
- **Context Injection**: Incoming requests hit an `authMiddleware` which securely verifies the session, identifies the User, queries their primary `TenantMember` relationship, and injects the `tenantId` into the request lifecycle context (`c.set("tenantId", tenantId)`).

## Isolation Strategy
Absolute data isolation is strictly enforced to prevent IDOR (Insecure Direct Object Reference) and BOLA (Broken Object Level Authorization) vulnerabilities.
- **Zero Client Trust**: The API completely ignores any `tenantId` or `userId` passed in request payloads or query parameters. It is impossible to spoof tenancy from the client side.
- **Server-Driven Tenancy**: All database operations in the `TransactionRepository` implicitly inherit the cryptographically verified `tenantId` from the backend context. 
- Every query is forced to include `where: { tenantId }`, ensuring User A can never access or modify User B's transactions, even if they guess a valid UUID.

## Future Improvements
- **LLM/AI Parsing Integration**: Augment the current heuristic and regex-based parsers with a structured LLM (e.g., Gemini or OpenAI) fallback to achieve 100% parsing reliability on entirely unpredictable statement formats.
- **File Uploads**: Implement PDF, CSV, and Image (OCR) bulk uploads.
- **Full RBAC Configuration**: Expand the `TenantMember` roles (e.g., Admin, Editor, Viewer) to restrict who can parse new statements vs. who can only view them.
- **Analytics Dashboard**: Add aggregation endpoints for total monthly spend, categorized transaction tracking, and balance forecasting.
