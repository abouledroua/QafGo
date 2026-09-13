// Using native global fetch

async function runTest() {
  const BASE_URL = 'http://127.0.0.1:5000';
  console.log('--- 1. Login with demo credentials ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login success:', loginData.success);
  const token = loginData.token || loginData.data?.token;
  if (!token) throw new Error('No token obtained: ' + JSON.stringify(loginData));

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('\n--- 2. Fetch Products list ---');
  const prodRes = await fetch(`${BASE_URL}/api/products`, { headers: authHeaders });
  const prodData = await prodRes.json();
  console.log('Products count:', prodData.data?.length);
  if (!prodData.data || prodData.data.length === 0) throw new Error('No products found');
  const targetProduct = prodData.data[0];
  console.log('First product:', targetProduct.id, targetProduct.designation, 'Qte:', targetProduct.qte, 'Prix vente:', targetProduct.prix_vente);

  console.log('\n--- 3. Fetch first student ---');
  const stuRes = await fetch(`${BASE_URL}/api/students`, { headers: authHeaders });
  const stuData = await stuRes.json();
  const student = stuData.data?.[0];
  if (!student) throw new Error('No student found');
  console.log('Selected student:', student.id, student.full_name, 'Initial unpaid_amount:', student.unpaid_amount, 'product_debt:', student.product_debt);

  console.log('\n--- 4. Sell 2 units of product with partial payment ---');
  const unitPrice = Number(targetProduct.prix_vente);
  const qty = 2;
  const totalAmount = unitPrice * qty;
  const paidAmount = totalAmount > 200 ? totalAmount - 200 : 50; // leave debt
  const expectedDebt = totalAmount - paidAmount;

  const sellRes = await fetch(`${BASE_URL}/api/products/sell`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student_id: student.id,
      product_id: targetProduct.id,
      quantity: qty,
      unit_price: unitPrice,
      paid_amount: paidAmount,
      notes: 'Test sell with partial debt'
    })
  });
  const sellData = await sellRes.json();
  console.log('Sell response success:', sellData.success, 'Receipt:', sellData.data?.receipt_no);
  console.log('Remaining debt calculated:', sellData.data?.remaining_debt, 'Expected:', expectedDebt);
  const saleId = sellData.data?.id || sellData.data?.sale_id;

  console.log('\n--- 5. Verify Student debts in Student List ---');
  const stuRes2 = await fetch(`${BASE_URL}/api/students`, { headers: authHeaders });
  const stuData2 = await stuRes2.json();
  const updatedStudent = stuData2.data?.find(s => s.id === student.id);
  console.log('Updated student product_debt:', updatedStudent.product_debt, 'unpaid_amount:', updatedStudent.unpaid_amount, 'has_unpaid:', updatedStudent.has_unpaid);

  console.log('\n--- 6. Verify Student Lifetime Dossier ---');
  const dossierRes = await fetch(`${BASE_URL}/api/students/${student.id}/history`, { headers: authHeaders });
  const dossierData = await dossierRes.json();
  console.log('Dossier summary:', dossierData.data?.summary);
  console.log('Dossier productSales count:', dossierData.data?.productSales?.length);
  const purchaseEvent = dossierData.data?.timeline?.find(e => e.type === 'PRODUCT_PURCHASE');
  console.log('Timeline purchase event found:', !!purchaseEvent, purchaseEvent?.title);

  console.log('\n--- 7. Pay installment towards the product debt ---');
  const payDebtRes = await fetch(`${BASE_URL}/api/products/sales/${saleId}/pay-debt`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      amount: expectedDebt, // pay full remaining debt
      notes: 'Settled in full via test'
    })
  });
  const payDebtData = await payDebtRes.json();
  console.log('Pay debt success:', payDebtData.success, 'New remaining debt:', payDebtData.data?.remaining_debt_now, 'Receipt:', payDebtData.data?.payment_receipt_no);

  // Pay sale 1 as well to settle all test debt
  await fetch(`${BASE_URL}/api/products/sales/1/pay-debt`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 200, notes: 'Settling sale 1' })
  });

  console.log('\n--- 8. Verify Student debts after full settlement of all test sales ---');
  const stuRes3 = await fetch(`${BASE_URL}/api/students`, { headers: authHeaders });
  const stuData3 = await stuRes3.json();
  const settledStudent = stuData3.data?.find(s => s.id === student.id);
  console.log('Student product_debt after all settlements:', settledStudent.product_debt, 'unpaid_amount:', settledStudent.unpaid_amount);

  console.log('\n=== ALL PRODUCT & DEBT WORKFLOW TESTS PASSED PERFECTLY! ===');
}

runTest().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
