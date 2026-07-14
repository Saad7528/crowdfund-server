# NovaFund Backend API Server

This is the Express API server that manages the database collections, authenticates requests using JSON Web Tokens (JWT), integrates with Stripe payments, and serves dashboard stats.

## 🔌 API Endpoints Map

### Public Auth
- `POST /login` - Sign in using email/password
- `POST /users` - Register a Supporter or Creator
- `POST /users/social` - Sync Google Sign-In profile
- `GET /users/check/:email` - Check if email is registered

### Authenticated Users (JWT Required)
- `GET /users/me` - Fetch profile information
- `GET /stats` - Fetch stats depending on active role
- `GET /notifications` - Fetch list of notifications
- `PATCH /notifications/read/:id` - Mark notification as read

### Supporter Actions
- `POST /contributions` - Pledge credits to campaign
- `POST /create-payment-intent` - Generate Stripe client secret
- `POST /payments` - Save Stripe billing reference and top-up credits
- `POST /reports` - File fraud report for campaign

### Creator Actions
- `POST /campaigns` - Launch pending campaign
- `PATCH /campaigns/:id` - Update campaign details
- `PATCH /contributions/status/:id` - Approve or Reject pledge
- `POST /withdrawals` - Request cash-out of raised credits

### Admin Actions
- `GET /users` - Fetch user listing
- `DELETE /users/:id` - Delete user
- `PATCH /users/role/:id` - Modify user role
- `PATCH /campaigns/status/:id` - Approve or Reject creator campaign
- `PATCH /withdrawals/status/:id` - Approve pending cash-outs
- `GET /reports` - Fetch flagged reports
- `DELETE /reports/:id` - Dismiss report
