# Product Requirements Document (PRD) for Karina's Bookkeeping Service

## 1. Introduction

### 1.1 Product Overview

Karina's Bookkeeping Service is a web application designed to simplify the management and categorization of bank transactions for small businesses, particularly single-employee companies in the healthcare services sector. The app allows users to manage multiple bank accounts, manually input transactions, categorize them (including sub-categories and transfers between accounts), upload CSV files for bulk transaction import, view transaction tables with current bank balances, filter transactions by date and other criteria, and analyze spending through summaries, charts, and exports. It serves as an improved alternative to standard banking tools, providing clearer insights into cash flow and expense allocation.

The app is built for personal use (e.g., the developer's girlfriend's company) but in a general manner, without hyper-specific customizations. Each bank account assumes a starting balance of $0 at creation, requiring all prior transactions to be added manually or via CSV upload.

### 1.2 Objectives

- Enable easy manual entry and categorization of transactions.
- Provide intuitive views and analyses to track where money is going.
- Enable CSV uploads for bulk transaction import with categorization workflow.
- Ensure the app is user-friendly, mobile-responsive, and scalable for future enhancements.
- Focus on MVP features for quick development and validation based on user feedback (specifically, whether the primary user likes it).

### 1.3 Success Metrics

Success is primarily qualitative: Does the primary user (girlfriend) like and use the app? Secondary metrics could include user retention (e.g., weekly logins), number of transactions entered, and informal feedback scores. No formal analytics integration is required for MVP.

### 1.4 Assumptions and Dependencies

- Currency is fixed as '$' (no multi-currency support).
- Hosting on Vercel; no scalability concerns for MVP (e.g., handles reasonable transaction volumes per user).
- No monetization; the app is free for the primary user and potentially friends.
- Users can create and manage multiple bank accounts within their account.
- Future features (e.g., bank API integrations for automatic syncing) are out-of-scope for MVP but may be added if successful.

## 2. User Personas

The app is tailored for small, single-employee businesses in healthcare services but built generally for broader applicability (e.g., individuals or freelancers managing finances).

### 2.1 Primary Persona: Small Business Owner in Healthcare

- **Name/Age**: Karina, 30s.
- **Background**: Owner and sole employee of a small healthcare services company (e.g., contracting for medical consultations or therapy).
- **Tech-Savviness**: Moderate; familiar with basic web apps and mobile devices but prefers simple, intuitive interfaces over complex tools.
- **Pain Points**: Current banking apps lack easy categorization for business-specific expenses (e.g., distinguishing contracting income from dividends). Manual tracking in spreadsheets is time-consuming and error-prone. Difficulty in quickly seeing category breakdowns or filtering historical transactions.
- **Goals**: Quickly input transactions on-the-go (mobile), categorize them accurately, view balances and summaries, and generate simple reports for tax or planning purposes.

### 2.2 Secondary Persona: General Small Business User

- **Name/Age**: Alex, 20s-40s.
- **Background**: Freelancer or small business owner (e.g., consultant, service provider) managing personal/business finances without dedicated accounting software.
- **Tech-Savviness**: Basic to moderate; uses apps like online banking but frustrated by limited analysis features.
- **Pain Points**: Overwhelmed by uncategorized transaction lists; hard to track spending patterns or prepare for audits/taxes without manual exports.
- **Goals**: Input transactions easily, customize categories, filter/views for insights, and export data for further use.

## 3. Functional Requirements

### 3.1 Authentication and User Management

- Use Supabase Auth with email/password only (no OAuth like Google for MVP).
- Users sign up with email and password.
- Basic profile: Store user ID, email, and associated bank accounts, transactions, and categories.
- Security: Rely on Supabase defaults (e.g., row-level security); no additional encryption, audit logs, or compliance (e.g., GDPR) for MVP.

### 3.1.1 Bank Account Management

- **Multiple Bank Accounts**: Users can create and manage multiple bank accounts (e.g., "Business Checking", "Savings Account", "Credit Card").
- **Account Creation**: Users can add new bank accounts with a name/identifier (e.g., "Chase Business Account").
- **Account Selection**: When viewing transactions or creating new ones, users can filter or select which bank account to view/manage.
- **Initial Balance**: Each bank account starts with a balance of $0 at creation; users must manually add historical transactions or upload CSV files to establish accurate balances.
- **Account-Specific Balances**: Each bank account maintains its own running balance, calculated from all transactions associated with that account.

### 3.2 Transaction Management

- **Input Transactions**: Manual entry form with the following mandatory fields:
  - Bank Account (dropdown/select to choose which bank account the transaction belongs to).
  - Date (date picker, default to current date).
  - Amount (numeric, positive for income, negative for expenses; prefixed with '$').
  - Description (text field for notes like "Client payment" or "Office supplies").
  - Category (dropdown/select from predefined or custom categories, including sub-categories and transfers to other bank accounts).
- No optional fields (e.g., payee, tags, notes) for MVP.
- **Transfers Between Accounts**: When categorizing a transaction as a transfer, users must specify the destination bank account. The system creates corresponding transactions in both accounts (outgoing from source account, incoming to destination account) to maintain accurate balances.
- Transactions are added to a Supabase database table.
- After entry, update and display the running bank balance for the selected account (cumulative sum of all transaction amounts for that account).

### 3.3 Categories

- **Default Categories**: Tailored for a single-employee healthcare business:
  - Income
    - Contracting Income (e.g., payments from clients for services).
    - Dividend Payments (e.g., owner distributions).
  - Expenses
    - Employee Payments (e.g., salary to self as owner).
    - Loans to Sole Shareholder (e.g., business loans or advances).
    - Business Expenses (e.g., general overhead).
    - Motor Vehicle Expenses (sub-category under Business Expenses).
    - Healthcare Supplies (sub-category under Business Expenses).
    - Utilities (e.g., office-related).
    - Rent/Office Space.
  - Transfers
    - Transfer to [Bank Account Name] (e.g., "Transfer to Savings Account"). When selected, users must specify the destination bank account. This category allows users to track money movements between their own bank accounts without affecting overall net worth calculations.
- Support hierarchical sub-categories (e.g., Expenses > Business Expenses > Motor Vehicle Expenses).
- **Custom Categories**: Users can add, edit, or delete custom categories/sub-categories via a simple management interface (e.g., form to create new ones, list with edit/delete buttons).
- **Transfer Categories**: Transfer categories are automatically created when users create new bank accounts (e.g., creating "Savings Account" creates a "Transfer to Savings Account" category). Users can also manually create custom transfer categories.
- Rules: No restrictions on custom categories for MVP; ensure deletions prompt confirmation if transactions are linked (optionally cascade or reassign).

### 3.4 Viewing Transactions

- **Transaction Table**: Display transactions in a sortable, paginated table (handle large volumes, e.g., 100+ transactions).
  - Columns: Bank Account, Date, Description, Amount ($), Category (with sub-category if applicable), Running Balance.
  - Features: Sorting (by date, amount, category, bank account), Pagination (e.g., 20 per page).
- **Filters**:
  - By bank account (select one or multiple accounts, or "All Accounts").
  - By date range (start/end dates).
  - By category/sub-category.
  - By amount range (min/max).
  - Search by description (text match).
- Real-time updates: Table refreshes after new transactions are added.
- **Account-Specific Views**: Users can view transactions filtered to a single bank account to see that account's balance and transaction history.

### 3.5 Analysis and Reporting

- **Category Views**: Group and view transactions by category/sub-category over a selected period (e.g., total loan payments from date X to Y).
- **Summary Reports**: Totals per category (e.g., total income, total expenses by type).
- **Visualizations**: Pie charts for category breakdowns (e.g., % of expenses by sub-category).
- **Time-Based Insights**: Total spending per category over time (e.g., line chart for monthly expenses).
- **Exports**: Options to export filtered transactions or summaries as CSV or PDF.
- Integrate with frontend libraries if needed (e.g., via shadcn for charts).

### 3.6 CSV Upload and Transaction Categorization Workflow

- **CSV Upload**: As part of the MVP, users can upload CSV files containing bank transaction data for any bank account.
  - Users select which bank account the CSV transactions belong to before or during upload.
  - The system parses the CSV file and extracts transaction data (date, amount, description, etc.).
  - **CSV Format**: The expected CSV format contains the following columns (comma-separated, no header row):
    1. Date (MM/DD/YYYY format, e.g., "06/10/2025")
    2. Description (text field, e.g., "MONTHLY PLAN FEE")
    3. Debit Amount (numeric, for expenses/outgoing transactions, e.g., "3.50")
    4. Credit Amount (numeric, for income/incoming transactions, e.g., "20857.10")
    5. Running Balance (numeric, e.g., "-3.50")
  - **Amount Calculation**: Each transaction will have either a debit OR a credit amount (not both). The system should convert this to a single amount value:
    - If debit amount exists: use negative value (expense)
    - If credit amount exists: use positive value (income)
    - If both are empty or zero: treat as $0.00 transaction (may need user review)
  - Parsed transactions are temporarily stored and added to a dedicated categorization queue/page.
- **Transaction Categorization Page**: After CSV upload, all parsed transactions appear on a categorization page where users can:
  - Review all imported transactions before they are permanently added to the account.
  - Categorize each transaction individually by selecting from available categories (including transfers to other bank accounts).
  - Bulk categorize multiple transactions at once (e.g., select multiple transactions and assign the same category).
  - Edit transaction details (date, amount, description) if parsing errors occurred.
  - Skip or delete transactions that shouldn't be imported.
- **Workflow**:
  1. User uploads CSV file for a selected bank account.
  2. System parses CSV and displays all transactions on the categorization page.
  3. User reviews and categorizes transactions (individually or in bulk).
  4. User confirms import, and transactions are added to the selected bank account.
  5. Bank account balance is updated based on the imported transactions.
- **Manual Transaction Creation**: Users can continue to manually create transactions at any time, independent of CSV uploads. Manual transactions are immediately added to the selected bank account without requiring categorization review.

## 4. Non-Functional Requirements

### 4.1 UI/UX Design

- **Framework**: Next.js with shadcn components and Supabase UI for consistency.
- **Mobile Responsiveness**: Fully responsive design (e.g., using Tailwind CSS breakpoints); ensure forms, tables, and charts adapt to mobile screens.
- **Ease of Use**: Simple, intuitive navigation (e.g., sidebar for transactions, categories, reports; clean layouts without clutter).
- **Accessibility**: Basic WCAG compliance (e.g., alt text for images/charts, keyboard navigation); no advanced requirements for MVP.
- **Handling Large Data**: Tables use pagination and virtual scrolling if transactions exceed 100-200.
- No specific color schemes or wireframes; prioritize clarity (e.g., green for income, red for expenses).

### 4.2 Performance and Scalability

- Handle up to 1,000 transactions per user without issues (Vercel hosting).
- Fast load times for tables and charts (optimize queries in Supabase).

### 4.3 Technical Stack

- **Frontend**: Next.js, shadcn, Supabase UI.
- **Backend/Database**: Supabase (for auth, storage, and realtime if needed).
- **Package Manager**: pnpm / pnpm dlx.
- **Other Tools**: None for MVP; no integrations like email notifications or analytics.

## 5. Scope and Prioritization

### 5.1 MVP Features (Must-Haves)

- Authentication (email/password).
- Multiple bank account management (create, select, view account-specific transactions).
- Manual transaction input with core fields (including bank account selection).
- CSV upload and parsing for bulk transaction import.
- Transaction categorization page for reviewing and categorizing CSV-imported transactions.
- Category management (defaults + custom, with sub-categories, including transfer categories).
- Transaction table with balance, sorting, pagination (including bank account column and filter).
- Filters (by bank account, date, category, amount, description search).
- Transfer transactions between bank accounts (with automatic dual-entry accounting).
- Basic analysis: Category views, summaries, pie charts, exports (CSV/PDF).

### 5.2 Nice-to-Haves (Post-MVP)

- Bank API integrations for automatic syncing.
- Recurring transactions.
- Advanced security (e.g., encryption, logs).
- Multi-currency or country-specific features.
- Email notifications.
- Analytics integration (e.g., Google Analytics).
- Enhanced CSV parsing with automatic category suggestions based on description patterns.

### 5.3 Out-of-Scope

- Multi-user support (e.g., teams).
- Advanced reporting (e.g., tax integrations).
- Any paid features or monetization.

## 6. Development Guidelines

- **Implementation Notes for LLMs/Cursor**:
  - Use Supabase SDK in Next.js for auth and database operations (e.g., tables for bank accounts, transactions, and categories).
  - Structure database:
    - Bank Accounts table (id, user_id, name, created_at).
    - Transactions table (id, user_id, bank_account_id, date, amount, description, category_id, transfer_to_account_id for transfers).
    - Categories table (id, user_id, name, parent_id for sub-categories, is_transfer_category boolean).
  - For CSV parsing, implement client-side or server-side parsing (consider using a library like PapaParse for CSV parsing).
  - CSV format: Expect comma-separated values with columns: Date (MM/DD/YYYY), Description, Debit Amount, Credit Amount, Running Balance. Convert debit/credit columns to single amount field (debit = negative, credit = positive).
  - For charts, integrate a library like Recharts or Chart.js via shadcn.
  - Ensure realtime updates (e.g., via Supabase subscriptions) for balance after inputs.
  - Example Flow: User logs in → Dashboard shows table → User can select bank account → Add Transaction button opens form → Submit updates DB and refreshes table.
  - Transfer Flow: User creates transaction with "Transfer to [Account]" category → System creates outgoing transaction in source account and incoming transaction in destination account → Both accounts' balances update accordingly.
- **Testing**: Basic unit tests for forms/components; manual testing for UX.
- No specific timeline; focus on MVP completion for user validation.

## 7. Risks and Mitigations

- Risk: User finds interface non-intuitive → Mitigation: Iterate based on feedback post-MVP.
- Risk: Data loss in Supabase → Mitigation: Rely on Supabase backups; advise manual exports.
- Risk: Performance with many transactions → Mitigation: Implement pagination early.
