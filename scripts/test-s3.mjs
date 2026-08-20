import { createHash, createHmac } from 'node:crypto';

const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Falta la variable ${name}`);
}

const endpoint = new URL(process.env.S3_ENDPOINT);
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const accessKey = process.env.S3_ACCESS_KEY_ID;
const secretKey = process.env.S3_SECRET_ACCESS_KEY;
const objectKey = `_health/s3-smoke-${Date.now()}.webp`;

const hash = (value) => createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const encodePath = (value) => value.split('/').map((part) => encodeURIComponent(part)).join('/');

async function request(method, key, body = '') {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payloadHash = hash(body);
  const pathname = `${endpoint.pathname.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${encodePath(key)}`;
  const headers = {
    host: endpoint.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };
  if (method === 'PUT') headers['content-type'] = 'image/webp';

  const signedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaders.map((name) => `${name}:${headers[name].trim()}\n`).join('');
  const canonicalRequest = [method, pathname, '', canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n');
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hash(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${secretKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;

  const response = await fetch(new URL(pathname, endpoint), { method, headers, body: method === 'PUT' ? body : undefined });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${response.status}: ${text.slice(0, 300)}`);
}

await request('PUT', objectKey, Buffer.from('RootPuzzle S3 smoke test'));
console.log(`PUT OK: s3://${bucket}/${objectKey}`);
await request('DELETE', objectKey);
console.log('DELETE OK: temporary object removed');
console.log('S3 connection OK');
