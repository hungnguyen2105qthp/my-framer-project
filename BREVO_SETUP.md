# Brevo Email Setup

To enable invitation emails, you need to configure Brevo API credentials.

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Brevo API Configuration
BREVO_API=your_brevo_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

## Getting Brevo API Key

1. Sign up or log in to [Brevo](https://www.brevo.com/)
2. Go to **Account** > **SMTP & API**
3. Click **Generate a new API key**
4. Copy the API key and add it to your `.env.local`

## Email Configuration

- `BREVO_API`: Your Brevo API key
- `FROM_EMAIL`: The sender email address (must be verified in Brevo)

## Testing

When users are invited through the Add button:
1. User is added to the `authorizedUsers` collection
2. An email is automatically sent via Brevo
3. Email contains the invitation message with their email address

## Email Template

**Subject:** "You have been invited"

**Content:** 
```
You have been invited to join our platform by [inviter].

Sign in or Create an Account using [user-email]

Use the email address [user-email] to access your account.
```