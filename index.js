const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require("child_process");

const args = process.argv.slice(2);
const [db_server, db_database, db_user, db_password] = args;
const baseUrl="http://localhost/"+db_database

if (!db_server || !db_database || !db_user || !db_password || !baseUrl) {
  console.error('❌ Missing required parameters.');
  process.exit(1);
}

const xmlDir = './xml-input';
const adminSqlDir = './adminsql';
const sqlDir = './sql';

main();

async function main() {
  try {
    console.log('🚀 Build started');
    validateFolders();
    await checkSqlLogin();
    await executeSqlFolder(adminSqlDir);
    await executeSqlFolder(sqlDir);
    await executeXmlFiles();
    console.log('\n✅ BUILD COMPLETED SUCCESSFULLY');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ BUILD FAILED:', err.message);
    process.exit(1);
  }
}
function validateFolders() {
  if (!fs.existsSync(adminSqlDir)) throw new Error(`SQL folder not found: ${adminSqlDir}`);
  if (!fs.existsSync(sqlDir)) throw new Error(`SQL folder not found: ${sqlDir}`);
  if (!fs.existsSync(xmlDir)) throw new Error(`XML folder not found: ${xmlDir}`);
}
async function checkSqlLogin() {
  console.log('🔌 Checking SQL connection...');
  return new Promise((resolve, reject) => {
    const cmd = `sqlcmd -S ${db_server} -d ${db_database} -U ${db_user} -P ${db_password} -Q "SELECT 1" -b`;
    exec(cmd, (error) => {
      if (error) reject(new Error('SQL login failed'));
      else {
        console.log('✅ SQL connection successful');
        resolve();
      }
    });
  });
}
async function executeSqlFolder(p1) {
  console.log('\n🔨 Executing SQL scripts');
  const sqlFiles = fs.readdirSync(p1).filter(f => /^\d+\.sql$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  for (const file of sqlFiles) {
    await executeQuery(path.join(p1, file));
  }
}
async function executeQuery(filePath) {
  console.log(`▶ Executing SQL: ${path.basename(filePath)}`);
  return new Promise((resolve, reject) => {
    const cmd = `sqlcmd -S ${db_server} -d ${db_database} -U ${db_user} -P ${db_password} -i "${filePath}" -b`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(new Error(`SQL failed: ${stderr}`));
      else {
        console.log('✅ SQL executed successfully');
        resolve();
      }
    });
  });
}
function parseFile(filePath) {
  const fileName = path.basename(filePath);
  const match = fileName.match(/^(\d+)-([^-.]+)-([^-.]+)\.xml$/);
  if (!match) {
    console.warn(`⚠️ SKIP: Invalid filename format -> ${fileName}`);
    return null;
  }
  return { seq: Number(match[1]), username: match[2], password: match[3], path: filePath, name: fileName };
}

async function executeXmlFiles() {
  const xmlFiles = fs.readdirSync(xmlDir).map(f => parseFile(path.join(xmlDir, f))).filter(Boolean).sort((a, b) => a.seq - b.seq);
  if (xmlFiles.length === 0) {
    console.log('⚠️ No valid XML files found');
    return;
  }
  console.log(`\n📄 Found ${xmlFiles.length} XML file(s)`);
  for (const file of xmlFiles) {
    await executeXml(file);
  }
}

async function executeXml(file) {
  try {
    console.log(`▶ Executing SEQ ${file.seq}: ${file.name}`);
    const xml = fs.readFileSync(file.path, 'utf8');
    let token;
    try {
      token = await arasLogin(file.username, file.password);
      console.log(`🔐 Logged in as ${file.username}`);
    } catch {
      console.warn(`⚠️ SKIP: Login failed for ${file.username}`);
      return;
    }

    const applyAML = await fetch(`${baseUrl}/server/odata/method.AUTOMATION_AML_VS24`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ AMLITEM: xml })
    });

    const result = await applyAML.json();
    if (result.error) console.warn(result.error.message);
    else console.log(`✅ SEQ ${file.seq} executed`);

  } catch (err) {
    console.warn(`⚠️ XML error: ${err.message}`);
  }
}
async function arasLogin(username, password) {
  const tokenEndpoint = await discoverTokenEndpoint(baseUrl);
  const md5 = crypto.createHash('md5').update(password, 'utf8').digest('hex').toUpperCase();
  const form = new URLSearchParams({ grant_type: 'password', scope: 'Innovator openid offline_access', client_id: 'IOMApp', username, password: md5, database: db_database });
  const res = await fetch(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
  if (!res.ok) throw new Error('Login failed');
  const json = await res.json();
  return json.access_token;
}
async function discoverTokenEndpoint(baseUrl) {
  const discoveryRes = await fetch(`${baseUrl}/Server/OAuthServerDiscovery.aspx`);
  if (!discoveryRes.ok) throw new Error(`OAuth discovery failed: ${discoveryRes.status}`);
  const discovery = await discoveryRes.json();
  const oauthBase = discovery?.locations?.[0]?.uri;
  if (!oauthBase) throw new Error('OAuth base URL not found in discovery response');
  const wellKnownRes = await fetch(`${oauthBase}.well-known/openid-configuration`);
  if (!wellKnownRes.ok) throw new Error(`OpenID config failed: ${wellKnownRes.status}`);
  const wellKnown = await wellKnownRes.json();
  if (!wellKnown.token_endpoint) throw new Error('token_endpoint not found');
  return wellKnown.token_endpoint;
}