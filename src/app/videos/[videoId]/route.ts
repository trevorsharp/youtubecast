import { NextResponse } from 'next/server';
import { getStream } from '~/services/videoService';
import { Quality } from '~/types';

const GET = async (request: Request, { params }: { params: { videoId: string } }) => {
  try {
    const { videoId } = params;

    const { searchParams } = new URL(request.url);
    const quality = parseInt(searchParams.get('quality') ?? '') || Quality.Default;
    const videoServer = searchParams.get('videoServer') ?? undefined;

    const videoUrl = await getStream(videoId, quality, videoServer);

    return NextResponse.redirect(encodeURI(videoUrl).replaceAll('%25', '%'), {
      status: 307,
      headers: { 'Cache-Control': 's-maxage=1800' },
    });
  } catch (errorMessage) {
    return new NextResponse((errorMessage as string | undefined) ?? 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
