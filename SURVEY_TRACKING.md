# Survey Tracking System

This document explains how the survey tracking system works in the Digital Events application.

## Overview

The survey tracking system automatically marks surveys as completed when users click the survey link in their email. This provides real-time tracking of survey engagement without requiring users to manually update their status.

## How It Works

### 1. Survey Email Generation

When a survey email is sent to a guest, it contains a unique tracking link instead of a direct link to the survey form:

```
/api/surveys/complete/{guestId}?eventId={eventId}
```

### 2. Survey Link Click Process

When a user clicks the survey link:

1. **Verification**: The system verifies that the guest exists and is associated with the event
2. **Invitation Check**: Confirms that a survey invitation was sent to this guest
3. **Completion Check**: Checks if the survey has already been completed
4. **Database Updates**:
   - Creates a survey record in the database
   - Updates the invitation status to "OPENED"
   - Records the timestamp of when the link was clicked
5. **Redirect**: Redirects the user to the actual survey form (Google Form or other)

### 3. Database Schema

The system uses the following database tables:

#### `invitations` table
- `type`: Set to 'SURVEY' for survey invitations
- `status`: Tracks the invitation status (SENT, OPENED, RESPONDED)
- `sentAt`: When the survey email was sent
- `openedAt`: When the survey link was clicked
- `respondedAt`: When the survey was completed

#### `surveys` table
- `guestId`: Reference to the guest
- `eventId`: Reference to the event
- `rating`: Survey rating (1-5)
- `feedback`: Text feedback from the user
- `submittedAt`: When the survey was submitted

## API Endpoints

### 1. Survey Completion Tracking
```
GET /api/surveys/complete/{guestId}?eventId={eventId}
```
- Marks survey as opened when link is clicked
- Creates survey record in database
- Redirects to actual survey form

### 2. Survey Status Update
```
POST /api/surveys/update-status
```
- Updates survey with actual feedback data
- Body: `{ guestId, eventId, rating, feedback }`

### 3. Survey Statistics
```
GET /api/surveys/stats/{eventId}
```
- Returns survey statistics for an event
- Includes sent, opened, completed counts and average rating

## Dashboard Integration

The dashboard includes a survey statistics section that shows:
- Number of surveys sent
- Number of surveys opened
- Number of surveys completed
- Average rating

## Environment Variables

Set the following environment variables:

```env
# Base URL for your application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# URL of your actual survey form (Google Form, etc.)
GOOGLE_FORM_URL=https://forms.google.com/your-form-id
```

## Testing

You can test the survey tracking system using the test page:

```
/test-survey
```

This page allows you to simulate clicking a survey link by entering a guest ID and event ID.

## Workflow

1. **Send Survey**: Use the "Send Survey to Attendees" button in the dashboard
2. **Email Sent**: Survey invitation is sent with tracking link
3. **User Clicks**: When user clicks the link, it's automatically tracked
4. **Complete Survey**: User completes the actual survey form
5. **View Stats**: Check survey statistics in the dashboard

## Benefits

- **Automatic Tracking**: No manual intervention required
- **Real-time Updates**: Immediate feedback when users engage with surveys
- **Comprehensive Analytics**: Track open rates, completion rates, and ratings
- **User-Friendly**: Seamless experience for survey participants

## Security Considerations

- Survey links are tied to specific guest-event combinations
- System verifies guest exists and is associated with the event
- Prevents duplicate submissions for the same guest
- Handles edge cases like invalid guest IDs or event IDs 