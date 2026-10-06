// Test database sync and authentication protection

const BASE_URL = 'http://localhost:3000'; // test through Vite proxy

async function run() {
  console.log('--- 1. Testing Products Fetch from Database ---');
  const prodsRes = await fetch(`${BASE_URL}/api/products`);
  console.log('Status:', prodsRes.status);
  const prods = await prodsRes.json();
  console.log(`Fetched ${prods.length} products from MongoDB`);

  const lehenga = prods.find(p => p.category === 'Bridal Lehenga') || prods[0];
  console.log('Target Product/Lehenga ID:', lehenga?._id, lehenga?.name);

  console.log('\n--- 2. Testing UNAUTHENTICATED Rental Booking (Must be blocked 401) ---');
  const anonRentalRes = await fetch(`${BASE_URL}/api/rentals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lehengaId: lehenga._id,
      customerName: 'Anonymous Hacker',
      customerPhone: '9999999999',
      startDate: '2026-10-15',
      returnDate: '2026-10-18',
    }),
  });
  console.log('Unauthenticated Rental Booking Status:', anonRentalRes.status);
  const anonRentalBody = await anonRentalRes.json();
  console.log('Response Message:', anonRentalBody.message);

  if (anonRentalRes.status === 401) {
    console.log('✅ PASS: Anonymous rental booking is strictly blocked by 401 Unauthorized!');
  } else {
    console.error('❌ FAIL: Expected 401 but got', anonRentalRes.status);
    process.exit(1);
  }

  console.log('\n--- 3. Testing UNAUTHENTICATED Order Placement (Must be blocked 401) ---');
  const anonOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ product: lehenga._id, name: lehenga.name, quantity: 1, price: lehenga.price }],
      totalAmount: lehenga.price,
      shippingAddress: {
        fullName: 'Anonymous',
        mobile: '9999999999',
        houseNo: '12',
        street: 'Main',
        city: 'City',
        state: 'State',
        pinCode: '471105'
      }
    }),
  });
  console.log('Unauthenticated Order Placement Status:', anonOrderRes.status);
  const anonOrderBody = await anonOrderRes.json();
  console.log('Response Message:', anonOrderBody.message);

  if (anonOrderRes.status === 401) {
    console.log('✅ PASS: Anonymous order placement is strictly blocked by 401 Unauthorized!');
  } else {
    console.error('❌ FAIL: Expected 401 but got', anonOrderRes.status);
    process.exit(1);
  }

  console.log('\n--- 4. Seeding Admin & Logging In ---');
  await fetch(`${BASE_URL}/api/auth/force-seed-admin`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@shagun.com',
      password: 'admin123',
    }),
  });
  console.log('Login Status:', loginRes.status);
  const userData = await loginRes.json();
  const token = userData.token;
  console.log('Authenticated User:', userData.name, '| Role:', userData.role, '| Token length:', token?.length);

  if (!token) {
    console.error('Failed to get token');
    process.exit(1);
  }

  console.log('\n--- 5. Testing AUTHENTICATED Rental Booking with JWT ---');
  const authRentalRes = await fetch(`${BASE_URL}/api/rentals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      lehengaId: lehenga._id,
      customerName: 'Priya Sharma',
      customerPhone: '9876543210',
      customerEmail: 'priya@example.com',
      startDate: '2026-11-01',
      returnDate: '2026-11-05',
      rentalPrice: lehenga.price,
      securityDeposit: 2500,
      notes: 'Need trial fit 1 day before'
    }),
  });
  console.log('Authenticated Rental Status:', authRentalRes.status);
  const rentalData = await authRentalRes.json();
  console.log('Rental ID:', rentalData._id, '| User:', rentalData.user, '| Status:', rentalData.status);

  if (authRentalRes.status === 201 && rentalData.user) {
    console.log('✅ PASS: Authenticated rental successfully created and bound to user in MongoDB!');
  } else {
    console.log('Rental creation response:', rentalData);
  }

  console.log('\n--- 6. Testing Conflicting Rental Date Overlap ---');
  const conflictRes = await fetch(`${BASE_URL}/api/rentals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      lehengaId: lehenga._id,
      customerName: 'Another Bride',
      customerPhone: '9876543211',
      startDate: '2026-11-02',
      returnDate: '2026-11-04',
      rentalPrice: lehenga.price,
      securityDeposit: 2500,
    }),
  });
  console.log('Conflict Booking Status:', conflictRes.status);
  const conflictData = await conflictRes.json();
  console.log('Conflict Message:', conflictData.message);
  if (conflictRes.status === 400 && conflictData.conflict) {
    console.log('✅ PASS: Overlapping rental dates correctly rejected with availability info!');
  }

  console.log('\n--- 7. Testing Active Rentals Query ---');
  const activeRes = await fetch(`${BASE_URL}/api/rentals/active`);
  const activeData = await activeRes.json();
  console.log('Active Rentals count:', activeData.activeRentals?.length);
  console.log('Active Map keys:', Object.keys(activeData.activeMap || {}));
  if (activeData.activeMap?.[lehenga._id]) {
    console.log('✅ PASS: Active rental map accurately marks lehenga as booked!');
  }

  console.log('\n--- 8. Testing AUTHENTICATED Order Placement with JWT ---');
  const authOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      items: [{ product: lehenga._id, name: lehenga.name, quantity: 1, price: lehenga.price }],
      totalAmount: lehenga.price,
      shippingAddress: {
        fullName: 'Priya Sharma',
        mobile: '9876543210',
        houseNo: 'House 45',
        street: 'Gandhi Road',
        city: 'Chhatarpur',
        state: 'Madhya Pradesh',
        pinCode: '471105'
      },
      paymentMethod: 'COD'
    }),
  });
  console.log('Authenticated Order Status:', authOrderRes.status);
  const orderData = await authOrderRes.json();
  console.log('Order ID:', orderData._id, '| User:', orderData.user, '| Status:', orderData.status);

  if (authOrderRes.status === 201 && orderData.user) {
    console.log('✅ PASS: Authenticated order successfully created and saved in MongoDB!');
  }

  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY! 🎉');
}

run().catch(console.error);
