import { handleTutorRequest } from '../../server/tutorHandler';

export async function handler(event: {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}) {
  const headers = event.headers || {};
  const result = await handleTutorRequest({
    method: event.httpMethod,
    origin: headers.origin || headers.Origin,
    authorization: headers.authorization || headers.Authorization,
    ip: headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || 'unknown',
    bodyText: event.body || '',
  });
  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
}
