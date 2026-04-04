# Database Migrations

These SQL scripts should be run in the **Supabase Dashboard SQL Editor** in sequential order.

## How to Run

1. Go to your Supabase Dashboard → SQL Editor
2. Run each script in order:

### Schema Migrations
- `02-add-dealer-users-table.sql` - Creates DealerUser table
- `03-add-missing-buyer-fields.sql` - Adds missing columns to BuyerProfile
- `04-add-missing-dealer-fields.sql` - Adds missing columns to Dealer
- `05-add-vehicle-fields.sql` - Adds missing columns to Vehicle
- `94-add-admin-mfa-fields.sql` - Adds MFA fields to User table and creates admin audit tables
- `95-add-connection-canary-table.sql` - Creates _connection_canary table for health checks

## Note

These scripts require SSL connections and cannot be run directly in the v0 runtime. Always run them in the Supabase SQL Editor.
