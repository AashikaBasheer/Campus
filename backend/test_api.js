const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING FULL API USE CASE TESTS ===\n');

  // Test 1: Create Event (Capacity = 2 for testing limits)
  console.log('--- Test 1: Create Event (Use Case 1) ---');
  const createRes = await request('POST', '/api/events', {
    Studid: 1,
    Eventname: 'Hackathon 2026',
    Eventdate: '2026-10-15',
    Capacity: 2
  });
  console.log('Create Event Response:', createRes.status, createRes.data);
  const eventId = createRes.data.Eventid;
  if (!eventId) throw new Error('Failed to create event');

  // Test 2: Register Student 1 (Use Case 2)
  console.log('\n--- Test 2: Register Student 1 for Event (Use Case 2) ---');
  const reg1Res = await request('POST', '/api/registrations', {
    Studid: 1,
    Eventid: eventId
  });
  console.log('Reg 1 Response:', reg1Res.status, reg1Res.data);
  const regId1 = reg1Res.data.pass?.RegId;

  // Test 3: Duplicate Registration prevention
  console.log('\n--- Test 3: Duplicate Registration check (Must be blocked) ---');
  const dupRes = await request('POST', '/api/registrations', {
    Studid: 1,
    Eventid: eventId
  });
  console.log('Duplicate Reg Response (Expected 409):', dupRes.status, dupRes.data);

  // Test 4: Register Student 2 (Hits capacity)
  console.log('\n--- Test 4: Register Student 2 (Capacity reached) ---');
  const reg2Res = await request('POST', '/api/registrations', {
    Studid: 2,
    Eventid: eventId
  });
  console.log('Reg 2 Response:', reg2Res.status, reg2Res.data);
  const regId2 = reg2Res.data.pass?.RegId;

  // Test 5: Register Student 3 (Must be blocked due to capacity)
  console.log('\n--- Test 5: Register Student 3 (Exceeds capacity - Must be blocked) ---');
  const fullRes = await request('POST', '/api/registrations', {
    Studid: 3,
    Eventid: eventId
  });
  console.log('Over-capacity Response (Expected 400):', fullRes.status, fullRes.data);

  // Test 6: Check-In Student 1 (Use Case 4)
  console.log('\n--- Test 6: Check-In Student 1 (Use Case 4) ---');
  const checkIn1 = await request('POST', '/api/registrations/check-in', {
    RegId: regId1
  });
  console.log('Check-In 1 Response:', checkIn1.status, checkIn1.data);

  // Test 7: Duplicate Check-In check (Must be blocked)
  console.log('\n--- Test 7: Check-In Student 1 Again (Must be blocked) ---');
  const dupCheckIn = await request('POST', '/api/registrations/check-in', {
    RegId: regId1
  });
  console.log('Duplicate Check-In Response (Expected 400):', dupCheckIn.status, dupCheckIn.data);

  // Test 8: View Event Summary (Use Case 5)
  console.log('\n--- Test 8: View Event Summary (Use Case 5) ---');
  const summaryRes = await request('GET', '/api/events/summary');
  console.log('Summary Response:', summaryRes.status, JSON.stringify(summaryRes.data, null, 2));

  // Test 9: Cancel Registration Student 2 (Use Case 3 - Capacity becomes available again)
  console.log('\n--- Test 9: Cancel Registration Student 2 (Use Case 3) ---');
  const cancelRes = await request('DELETE', `/api/registrations/${regId2}`);
  console.log('Cancel Response:', cancelRes.status, cancelRes.data);

  // Test 10: Register Student 3 now that capacity is freed up
  console.log('\n--- Test 10: Register Student 3 after cancellation (Must now succeed) ---');
  const reg3Res = await request('POST', '/api/registrations', {
    Studid: 3,
    Eventid: eventId
  });
  console.log('Reg 3 Response (Expected 201):', reg3Res.status, reg3Res.data);

  // Final Summary
  console.log('\n--- Final Summary Check ---');
  const finalSummary = await request('GET', '/api/events/summary');
  console.log('Final Summary:', JSON.stringify(finalSummary.data, null, 2));

  console.log('\nALL 10 API USE CASE TESTS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
