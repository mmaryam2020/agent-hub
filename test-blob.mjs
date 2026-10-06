import { list } from '@vercel/blob';

async function run() {
  const { blobs } = await list({ limit: 10, token: process.env.BLOB_READ_WRITE_TOKEN });
  const agentic = blobs.find(b => b.pathname.toLowerCase().includes('agentic'));
  if (agentic) {
    console.log("Found URL:", agentic.url);
    const res = await fetch(agentic.url);
    const text = await res.text();
    console.log("--- CONTENT START ---");
    console.log(text.substring(0, 1000));
    console.log("--- CONTENT END ---");
  } else {
    console.log('Not found');
  }
}
run().catch(console.error);
