const jwt = require('jsonwebtoken');
const http = require('http');
const SECRET = 'f88e3310dbc6d3863169fb2d29759dab646626214052b32e61d290b778ff32cc';

function makeToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

function apiCall(method, path, token, body, headers) {
  headers = headers || {};
  return new Promise(function(resolve, reject) {
    var opts = {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api' + path,
      method: method,
      headers: Object.assign({
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      }, headers),
    };
    var req = http.request(opts, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  var passed = 0;
  var failed = 0;
  
  function check(name, ok, detail) {
    if (ok) { passed++; console.log('  OK ' + name); }
    else { failed++; console.log('  FAIL ' + name + ': ' + (detail || '')); }
  }
  
  var directorToken = makeToken({ id: 71, role: 'director', office_id: 31 });
  var adminToken = makeToken({ id: 94, role: 'admin', office_id: 31 });
  var repToken = makeToken({ id: 81, role: 'representative', office_id: 27 });
  var lawyerToken = makeToken({ id: 80, role: 'lawyer', office_id: 27 });
  
  // Test 1: Single-office admin
  var r = await apiCall('GET', '/contracts', adminToken);
  check('Admin gets contracts', r.status === 200 && r.data.success);
  
  // Test 2: Director contracts
  r = await apiCall('GET', '/contracts', directorToken);
  check('Director gets contracts', r.status === 200 && r.data.success);
  
  // Test 3: Director X-Office-Id switch
  r = await apiCall('GET', '/contracts', directorToken, null, { 'X-Office-Id': '27' });
  check('Director X-Office-Id=27', r.status === 200 && r.data.success);
  
  // Test 4: GET staff offices
  r = await apiCall('GET', '/staff/81/offices', directorToken);
  check('GET /staff/81/offices', r.status === 200 && r.data.success);
  
  // Test 5: Assign 2 offices to rep
  r = await apiCall('PUT', '/staff/81/offices', directorToken, { office_ids: [27, 31] });
  check('PUT offices [27,31]', r.status === 200 && r.data.success, JSON.stringify(r.data).slice(0, 120));
  
  // Test 6: Verify 2 offices
  r = await apiCall('GET', '/staff/81/offices', directorToken);
  var oids = (r.data.offices || []).map(function(o) { return o.office_id; });
  check('Rep has 2 offices', oids.length === 2, JSON.stringify(oids));
  
  // Test 7: Multi-office rep switches to office 31
  r = await apiCall('GET', '/contracts', repToken, null, { 'X-Office-Id': '31' });
  check('Rep X-Office-Id=31', r.status === 200, 'status=' + r.status + ' msg=' + (r.data.message || ''));
  
  // Test 8: Non-director cannot assign
  r = await apiCall('PUT', '/staff/81/offices', adminToken, { office_ids: [27, 31] });
  check('Admin 403 on assign', r.status === 403);
  
  // Test 9: History recorded
  r = await apiCall('GET', '/staff/81/offices', directorToken);
  var hist = r.data.history || [];
  check('History has entries', hist.length > 0, 'count=' + hist.length);
  
  // Test 10: Clients works
  r = await apiCall('GET', '/clients', adminToken);
  check('Admin clients', r.status === 200);
  
  // Test 11: Lawyer contracts
  r = await apiCall('GET', '/contracts', lawyerToken);
  check('Lawyer contracts', r.status === 200 && r.data.success);
  
  // Test 12: Director staff list
  r = await apiCall('GET', '/staff', directorToken);
  check('Director staff list', r.status === 200 && (r.data.employees || []).length > 0);
  
  // Test 13: Remove extra office
  r = await apiCall('PUT', '/staff/81/offices', directorToken, { office_ids: [27] });
  check('Remove office 31', r.status === 200);
  
  // Test 14: Primary office must stay
  r = await apiCall('PUT', '/staff/81/offices', directorToken, { office_ids: [31] });
  check('Cannot remove primary', r.status === 400, (r.data.message || '').slice(0, 80));
  
  // Test 15: Clients for multi-office (re-assign, then test)
  await apiCall('PUT', '/staff/81/offices', directorToken, { office_ids: [27, 31] });
  r = await apiCall('GET', '/clients', repToken);
  check('Rep clients works', r.status === 200);
  
  console.log('\nTotal: ' + passed + '/' + (passed + failed) + ' passed');
  
  // Cleanup: restore single office
  await apiCall('PUT', '/staff/81/offices', directorToken, { office_ids: [27] });
}

runTests().catch(function(e) { console.error(e); });
