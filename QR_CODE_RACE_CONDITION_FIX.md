# QR Code Race Condition Fix

## Problem Description

The QR code scanning system was experiencing race conditions where multiple rapid scans of the same QR code could result in:
- Multiple successful validations of the same QR code
- "Scan failed" errors due to concurrent database updates
- Inconsistent state where some requests succeeded while others failed

## Root Cause

The race condition occurred because:
1. Multiple validation requests could be processed simultaneously
2. The database update to mark QR codes as "USED" was not properly locked
3. The frontend validation state check had a small window where multiple requests could be initiated

## Solution Implemented

### 1. Database-Level Locking

**File: `src/app/api/qr/validate/route.ts`**

- **Row-Level Locking**: Used `SELECT ... FOR UPDATE SKIP LOCKED` to prevent concurrent access to the same QR code record
- **Database Transactions**: Wrapped the entire validation logic in a database transaction with proper timeout handling
- **Atomic Updates**: Ensured that only one request can update a QR code's status at a time

```sql
SELECT id, code, type, status, "guestId", "eventId", "usedAt", "createdAt"
FROM qr_codes 
WHERE code = $1 AND "eventId" = $2 AND status IN ('SENT', 'GENERATED', 'USED')
FOR UPDATE SKIP LOCKED
```

### 2. Frontend Race Condition Prevention

**File: `src/app/scanner/page.tsx`**

- **Improved State Management**: Enhanced the `isValidating` state check to prevent multiple simultaneous validations
- **Debouncing**: Added a 100ms delay in the scan loop to prevent rapid successive scans
- **Better Error Handling**: Added comprehensive error handling for timeout and network errors

### 3. Comprehensive Debugging

**Files:**
- `src/app/api/debug/qr-codes/route.ts` - Debug API endpoint
- `src/app/debug/qr-codes/page.tsx` - Debug UI page
- `scripts/test-qr-race-condition.js` - Test script

**Features:**
- Request ID tracking for all validation requests
- Detailed logging with timestamps
- Performance metrics (processing time)
- QR code statistics and recent activity
- Filterable debug interface

## How to Test the Fix

### 1. Manual Testing

1. Start your development server: `npm run dev`
2. Navigate to `/scanner` and select an event
3. Try scanning the same QR code multiple times rapidly
4. Check the browser console for detailed logs
5. Verify that only one validation succeeds

### 2. Automated Testing

1. Update the test script configuration:
   ```javascript
   const TEST_QR_CODE = 'your-actual-qr-code';
   const EVENT_ID = 'your-actual-event-id';
   ```

2. Run the test script:
   ```bash
   node scripts/test-qr-race-condition.js
   ```

3. Expected result: Only one request should succeed, others should be rejected with proper error messages.

### 3. Debug Interface

1. Navigate to `/debug/qr-codes` in your browser
2. Use the filters to search for specific QR codes
3. View statistics and recent activity
4. Monitor real-time QR code usage

## Debug Information Available

When a scan fails, you now have access to:

### API Response Debug Data
```json
{
  "error": "QR code already used",
  "details": {
    "usedAt": "2024-01-15T10:30:00Z",
    "formattedTime": "1/15/2024, 10:30:00 AM",
    "timeAgo": "5 minutes ago",
    "timeDiffSeconds": 300,
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  },
  "debug": {
    "requestId": "abc123",
    "processingTimeMs": 150,
    "code": "qr-code-123",
    "eventId": "event-456",
    "qrCodeId": "qr-789",
    "usedAt": "2024-01-15T10:30:00Z",
    "timeDiffSeconds": 300,
    "thresholdSeconds": 5
  }
}
```

### Console Logs
The system now logs detailed information including:
- Request IDs for tracking
- Processing times
- Database transaction status
- Lock acquisition details
- Error conditions with context

## Performance Considerations

- **Lock Timeout**: 10 seconds maximum for database transactions
- **Lock Wait**: 5 seconds maximum wait for row locks
- **Frontend Debouncing**: 100ms delay between scans
- **Error Recovery**: Automatic retry suggestions for timeout errors

## Monitoring

### Key Metrics to Watch
1. **Success Rate**: Should be 100% for valid QR codes (no race conditions)
2. **Processing Time**: Should be consistent and under 1 second
3. **Timeout Errors**: Should be minimal
4. **Concurrent Requests**: Should be properly serialized

### Debug Endpoints
- `GET /api/debug/qr-codes` - QR code statistics and details
- `POST /api/qr/validate` - Enhanced with debug information

## Troubleshooting

### Common Issues

1. **"QR code validation timeout"**
   - Check database connection
   - Verify no long-running transactions
   - Monitor database performance

2. **"Scan failed - network error"**
   - Check network connectivity
   - Verify API endpoint is accessible
   - Check server logs for errors

3. **Multiple successful scans**
   - Verify the fix is deployed
   - Check database transaction logs
   - Use debug interface to investigate

### Debug Steps

1. **Check Console Logs**: Look for request IDs and processing times
2. **Use Debug Interface**: Navigate to `/debug/qr-codes` for detailed information
3. **Database Queries**: Check for any long-running transactions
4. **Network Tab**: Monitor API request/response times

## Future Improvements

1. **Real-time Monitoring**: Add WebSocket-based real-time updates
2. **Performance Metrics**: Add detailed performance tracking
3. **Alerting**: Set up alerts for unusual patterns
4. **Load Testing**: Automated load testing for high-volume scenarios

## Files Modified

- `src/app/api/qr/validate/route.ts` - Main validation logic with race condition fix
- `src/app/scanner/page.tsx` - Frontend improvements and debugging
- `src/app/api/debug/qr-codes/route.ts` - Debug API endpoint
- `src/app/debug/qr-codes/page.tsx` - Debug UI interface
- `src/components/Navigation.tsx` - Added debug page link
- `scripts/test-qr-race-condition.js` - Test script for validation

## Conclusion

The race condition has been fixed through:
1. **Database-level locking** to prevent concurrent updates
2. **Frontend improvements** to reduce rapid successive requests
3. **Comprehensive debugging** to monitor and troubleshoot issues
4. **Better error handling** to provide clear feedback to users

The system now properly handles concurrent QR code scans and provides detailed debugging information to help identify and resolve any remaining issues. 