import { NextResponse } from 'next/server';
import { getRssFeed } from '~/services/feedService';
import { Quality } from '~/types';

const GET = async (request: Request, { params }: { params: { sourceId: string } }) => {
  try {
    const { sourceId } = params;

    const hostname = request.headers.get('host') ?? '';

    const { searchParams } = new URL(request.url);
    const quality = parseInt(searchParams.get('quality') ?? '') || Quality.Default;
    const videoServer = searchParams.get('videoServer') ?? undefined;
    const excludeShorts = searchParams.get('excludeShorts') !== null;

    const rssFeed = await getRssFeed(sourceId, hostname, quality, excludeShorts, videoServer);

    return new NextResponse(rssFeed, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 's-maxage=1800' },
    });
  } catch (errorMessage) {
    return new NextResponse((errorMessage as string | undefined) ?? 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
export const fetchCache = 'default-no-store';
