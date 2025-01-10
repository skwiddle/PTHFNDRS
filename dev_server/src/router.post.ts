import path from 'node:path';
import { query } from './db.js';
import { ConsoleLog } from './lib/ericchase/Utility/Console.js';

export async function post(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  ConsoleLog(`POST     ${pathname}`);

  // ConsoleLog(`HEADERS`);
  // for (const [k, v] of req.headers) {
  //   ConsoleLog(`    ${k}: ${v}`);
  // }

  // custom routing here
  switch (pathname) {
    case '/write/highlights':
      try {
        if (Bun.env.PUBLIC_PATH) {
          const public_path = path.normalize(Bun.env.PUBLIC_PATH);
          Bun.write(path.join(public_path, './map-highlights.svg'), await req.text());
        }
        return new Response('OK', { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify(error), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          status: 500,
        });
      }
    case '/write/markers':
      try {
        if (Bun.env.PUBLIC_PATH) {
          const public_path = path.normalize(Bun.env.PUBLIC_PATH);
          Bun.write(path.join(public_path, './map-markers.json'), await req.text());
        }
        return new Response('OK', { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify(error), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          status: 500,
        });
      }
    case '/database/query': {
      try {
        const { text, params } = await req.json();
        const result = await query(text, params);
        return new Response(JSON.stringify(result), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify(error), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          status: 500,
        });
      }
    }
  }
}

export async function analyzeBody(req: Request | Response) {
  const data: {
    blob?: true;
    form?: true;
    json?: true;
    text?: true;
  } = {};
  try {
    await req.clone().blob();
    data.blob = true;
  } catch (_) {}
  try {
    await req.clone().formData();
    data.form = true;
  } catch (_) {}
  try {
    await req.clone().json();
    data.json = true;
  } catch (_) {}
  try {
    await req.clone().text();
    data.text = true;
  } catch (_) {}
  return data;
}
