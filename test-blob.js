require('dotenv').config({ path: '.env' });
const { list } = require('@vercel/blob');

async function run() {
  const { blobs } = await list({ limit: 10 });
  const agentic = blobs.find(b => b.pathname.toLowerCase().includes('agentic'));
  if (agentic) {
    console.log(JSON.stringify(agentic, null, 2));
  } else {
    console.log('Not found');
  }
}
run().catch(console.error);
