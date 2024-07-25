import { NextResponse } from 'next/server';
import { getStream } from '~/services/videoService';
import { Quality } from '~/types';

const GET = async (request: Request, { params }: { params: { videoId: string } }) => {
  try {
    const { videoId } = params;

    const { searchParams } = new URL(request.url);
    const quality = parseInt(searchParams.get('quality') ?? '') || Quality.Default;
    const videoServer = searchParams.get('videoServer') ?? undefined;

    const [videoUrl, isVideoServer] = await getStream(videoId, quality, videoServer);

    return NextResponse.redirect(encodeURI(videoUrl).replaceAll('%25', '%'), {
      status: 307,
      headers: { 'Cache-Control': `s-maxage=${isVideoServer ? '60' : '600'}` },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse(typeof error === 'string' ? error : 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
