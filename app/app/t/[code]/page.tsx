import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.ximples.com.br';

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * Tracked short link handler.
 *
 * Calls the backend resolve endpoint (which also registers the click event)
 * and issues a server-side redirect to the original URL. Forwards the
 * visitor's IP and user-agent so the click is attributed correctly.
 *
 * Falls back to the homepage on any error so users never see a broken page.
 */
export default async function TrackedRedirect({ params }: Props) {
  const { code } = await params;
  const fallback = '/';

  if (!code || !/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
    redirect(fallback);
  }

  const reqHeaders = await headers();
  const forwardedFor =
    reqHeaders.get('x-forwarded-for') ??
    reqHeaders.get('x-real-ip') ??
    '';
  const userAgent = reqHeaders.get('user-agent') ?? '';

  try {
    const res = await fetch(`${API_URL}/api/v1/tracking/resolve/${code}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
        ...(userAgent ? { 'user-agent': userAgent } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      redirect(fallback);
    }

    const body = await res.json();
    const target: string | undefined = body?.data?.redirect_url;

    if (!target) {
      redirect(fallback);
    }

    redirect(target);
  } catch (err) {
    // next/navigation's redirect() throws internally; rethrow so Next handles it.
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    redirect(fallback);
  }
}
