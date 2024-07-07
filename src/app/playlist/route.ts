import { NextResponse } from 'next/server';

const GET = (request: Request) => {
  try {
    const hostname = request.headers.get('host') ?? '';

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('list') ?? undefined;

    if (!playlistId) {
      return NextResponse.redirect(`http://${hostname}`);
    }

    return NextResponse.redirect(`http://${hostname}/${playlistId}`);
  } catch (errorMessage) {
    return new NextResponse((errorMessage as string | undefined) ?? 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
