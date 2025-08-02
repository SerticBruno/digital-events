const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change this to your server URL
const TEST_QR_CODE = 'test-qr-code-123'; // Change this to a valid QR code
const EVENT_ID = 'your-event-id'; // Change this to a valid event ID
const CONCURRENT_REQUESTS = 5; // Number of concurrent requests to simulate

async function validateQRCode(code, eventId, requestId) {
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Starting validation for QR code: ${code}`);
    
    const response = await fetch(`${BASE_URL}/api/qr/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code: code,
        eventId: eventId
      })
    });

    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log(`[${requestId}] Response received in ${processingTime}ms:`, {
      status: response.status,
      success: result.success,
      error: result.error,
      debug: result.debug
    });
    
    return {
      requestId,
      status: response.status,
      success: result.success,
      error: result.error,
      processingTime,
      debug: result.debug
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${processingTime}ms:`, error.message);
    return {
      requestId,
      status: 'ERROR',
      success: false,
      error: error.message,
      processingTime
    };
  }
}

async function testRaceCondition() {
  console.log('🚀 Starting QR Code Race Condition Test');
  console.log(`📊 Testing with ${CONCURRENT_REQUESTS} concurrent requests`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📱 QR Code: ${TEST_QR_CODE}`);
  console.log(`🎫 Event ID: ${EVENT_ID}`);
  console.log('─'.repeat(60));
  
  // Create concurrent requests
  const promises = [];
  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    const promise = validateQRCode(TEST_QR_CODE, EVENT_ID, `REQ-${i.toString().padStart(2, '0')}`);
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  const results = await Promise.all(promises);
  
  console.log('─'.repeat(60));
  console.log('📋 Test Results Summary:');
  console.log('─'.repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  let timeoutCount = 0;
  let totalProcessingTime = 0;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const timeInfo = `${result.processingTime}ms`;
    
    console.log(`${index + 1}. [${result.requestId}] ${status} (${timeInfo})`);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      if (result.status === 408) {
        timeoutCount++;
      }
    }
    
    totalProcessingTime += result.processingTime;
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.debug) {
      console.log(`   Debug: ${JSON.stringify(result.debug, null, 2)}`);
    }
  });
  
  console.log('─'.repeat(60));
  console.log('📊 Final Statistics:');
  console.log(`✅ Successful requests: ${successCount}/${CONCURRENT_REQUESTS}`);
  console.log(`❌ Failed requests: ${errorCount}/${CONCURRENT_REQUESTS}`);
  console.log(`⏰ Timeout requests: ${timeoutCount}/${CONCURRENT_REQUESTS}`);
  console.log(`⏱️  Average processing time: ${Math.round(totalProcessingTime / CONCURRENT_REQUESTS)}ms`);
  console.log(`⏱️  Total processing time: ${totalProcessingTime}ms`);
  
  // Analysis
  console.log('─'.repeat(60));
  console.log('🔍 Analysis:');
  
  if (successCount === 1 && errorCount === CONCURRENT_REQUESTS - 1) {
    console.log('✅ RACE CONDITION FIXED: Only one request succeeded, others were properly rejected');
  } else if (successCount > 1) {
    console.log('⚠️  RACE CONDITION DETECTED: Multiple requests succeeded (this should not happen)');
  } else if (successCount === 0) {
    console.log('❓ All requests failed - check if QR code is valid or already used');
  } else {
    console.log('🤔 Unexpected result - check the individual request details above');
  }
  
  console.log('─'.repeat(60));
  console.log('🏁 Test completed');
}

// Run the test
if (require.main === module) {
  testRaceCondition().catch(console.error);
}

module.exports = { testRaceCondition, validateQRCode }; 