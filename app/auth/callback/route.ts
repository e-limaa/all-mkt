import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUrl = new URL('/login', url.origin);
  const errorDescription = url.searchParams.get('error_description');
  const message = errorDescription
    ? `Falha ao confirmar e-mail: ${errorDescription}`
    : 'E-mail confirmado com sucesso. Faça login para continuar.';

  redirectUrl.searchParams.set('message', message);

  return NextResponse.redirect(redirectUrl);
}
