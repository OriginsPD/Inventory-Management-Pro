async function test() {
  try {
    const r1 = await fetch('http://localhost:3002/api/users/admin');
    console.log('/api/users/admin response status:', r1.status);
    const body1 = await r1.text();
    console.log('/api/users/admin response body:', body1);
  } catch (e) {
    console.error('/api/users/admin failed:', e);
  }

  try {
    const r2 = await fetch('http://localhost:3002/api/users/admin/');
    console.log('/api/users/admin/ response status:', r2.status);
    const body2 = await r2.text();
    console.log('/api/users/admin/ response body:', body2);
  } catch (e) {
    console.error('/api/users/admin/ failed:', e);
  }
}

test();
