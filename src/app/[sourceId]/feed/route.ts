import { NextResponse } from 'next/server';
import { getRssFeed } from '~/services/feedService';
import { Quality } from '~/types';

const GET = async (request: Request, { params }: { params: { sourceId: string } }) => {
  try {
    const { sourceId } = params;

    const hostname = request.headers.get('host') ?? '';

    const { searchParams } = new URL(request.url);
    const quality = parseInt(searchParams.get('quality') ?? '') || Quality.Default;

    const rssFeed = await getRssFeed(sourceId, hostname, quality);

    return new NextResponse(rssFeed, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 's-maxage=1800' },
    });
  } catch (error) {
    if (typeof error === 'string' && error.toLowerCase().includes('not found'))
      return new NextResponse(error, { status: 404 });

    console.error(error);

    return new NextResponse(typeof error === 'string' ? error : 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
export const fetchCache = 'default-no-store';
