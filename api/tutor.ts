import { handleTutorRequest, readNodeBody } from '../server/tutorHandler';

type NodeReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
  on: Function;
};

type NodeRes = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (body?: string) => void;
};

function header(req: NodeReq, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  const bodyText = typeof req.body === 'string'
    ? req.body
    : req.body
      ? JSON.stringify(req.body)
      : await readNodeBody(req);

  const result = await handleTutorRequest({
    method: req.method || 'GET',
    origin: header(req, 'origin'),
    authorization: header(req, 'authorization'),
    ip: header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    bodyText,
  });

  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers)) {
    res.setHeader(k, v);
  }
  res.end(result.body);
}
