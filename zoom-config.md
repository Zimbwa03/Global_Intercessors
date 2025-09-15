# Zoom Integration Configuration

## Environment Variables Setup

Create a `.env` file in your project root with the following variables:

```bash
# Zoom API Credentials
ZOOM_CLIENT_ID=9hf40BCTRvKj8OsGRRu_5Q
ZOOM_API_SECRET=B1hJL6D1sFlOcplDTIiSucr5RcGOdyJe
ZOOM_ACCOUNT_ID=X9Q32jQ2Rkyi1GPortkAuQ

# Supabase Configuration
SUPABASE_URL=https://lmhbvdxainxcjuveisfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQwMDAsImV4cCI6MjA1MDU1MDAwMH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Admin Security
ADMIN_SECRET_KEY=your_secure_admin_key_here

# Development
NODE_ENV=development
```

## Next Steps

1. Create the `.env` file with the above content
2. Get your Supabase Service Role Key from your Supabase dashboard
3. Set a secure admin key
4. Start the development server
5. Test the Zoom integration

## Testing Endpoints

Once the server is running, test these endpoints:

- `GET /api/admin/test-zoom?admin_key=dev-admin-key` - Test Zoom connection
- `POST /api/admin/activate-zoom` - Activate Zoom tracking
- `GET /api/attendance/{userId}` - Check attendance data

