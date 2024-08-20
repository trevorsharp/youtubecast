import { NextResponse } from 'next/server';
import { env } from '~/env';
import { getStream } from '~/services/videoService';
import { Quality } from '~/types';

const GET = async (request: Request, { params }: { params: { videoId: string } }) => {
  try {
    const { videoId } = params;

    const { searchParams } = new URL(request.url);
    const quality = parseInt(searchParams.get('quality') ?? '') || Quality.Default;
    const videoServer = searchParams.get('videoServer') ?? undefined;

    if (env.NEXT_PUBLIC_VIDEO_SERVER_ONLY && !videoServer) {
      return new NextResponse(
        `The 'videoServer' parameter is missing. This application is no longer supported without the use of YouTubeCast Video Server. Please see https://github.com/trevorsharp/youtubecast-videoserver/blob/main/setup.md for more information.`,
        { status: 400 },
      );
    }

    const [videoUrl, isVideoServer] = await getStream(videoId, quality, videoServer);

    return NextResponse.redirect(encodeURI(videoUrl).replaceAll('%25', '%'), {
      status: 307,
      headers: { 'Cache-Control': `s-maxage=${isVideoServer ? '60' : '600'}` },
    });
  } catch (error) {
    if (typeof error === 'string' && error.toLowerCase().includes('video unavailable'))
      return new NextResponse('Video Unavailable', { status: 403 });

    console.error(error);

    return new NextResponse(typeof error === 'string' ? error : 'Unexpected Error', {
      status: 500,
    });
  }
};

export { GET };
