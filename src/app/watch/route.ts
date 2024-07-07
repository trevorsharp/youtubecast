import { NextResponse } from 'next/server';

const GET = (request: Request) => {
  try {
    const hostname = request.headers.get('host') ?? '';

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('v') ?? undefined;

    if (!videoId) {
      return NextResponse.redirect(`http://${hostname}`);
    }

    return NextResponse.redirect(`http://${hostname}/videos/${videoId}`);
  } catch (errorMessage) {
    return new NextResponse((errorMessage as string | undefined) ?? 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
