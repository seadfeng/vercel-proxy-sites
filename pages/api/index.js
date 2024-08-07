// api/proxy.js
export const runtime = 'edge';
export default async function handler(req) { 
  const url = new URL(`https://${req.headers.host}${req.url}`);
  const { host, pathname } = url; 

  if (pathname === '/robots.txt') {
    const robots = `User-agent: *
Disallow: /
    `;
    return new Response(robots, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  const ownDomain = process.env.OWN_DOMAIN;
  let targetDomain;
  try {
    targetDomain = getTargetDomain(host, ownDomain);
  } catch (error) {
    console.error('Error extracting target domain:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
  const origin = `https://${targetDomain}`;
  const actualUrl = `${origin}${pathname}${url.search}${url.hash}`;

  console.log("ownDomain", ownDomain);
  console.log("targetDomain", targetDomain);
  console.log("actualUrl", actualUrl);
  console.log("VERCEL_PROJECT_PRODUCTION_URL", process.env.VERCEL_PROJECT_PRODUCTION_URL);

  try {
    const response = await fetch(actualUrl, {
      method: req.method,
      headers: req.headers,
      redirect: 'follow'
    });

    let body = await response.text();
    const contentType = response.headers.get('content-type');

    if (contentType && /^(application\/x-javascript|text\/)/i.test(contentType)) {
      body = body.replace(new RegExp(`(//|https?://)${targetDomain}`, 'g'), `$1${host}`);
    }

    return new Response(body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

const getTargetDomain = (host, ownDomain) => {
  if(!host.includes(`.${ownDomain}`)) throw new Error('target domain is null');
  const domains = host.split(`.${ownDomain}`);
  return domains[0];
};
