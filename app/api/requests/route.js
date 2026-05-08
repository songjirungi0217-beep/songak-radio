import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const request_type = searchParams.get('request_type');

  try {
    const whereClause = {};
    if (status) whereClause.status = status;
    if (request_type) whereClause.request_type = request_type;

    const requests = await prisma.songRequest.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    // Check for duplicate song today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let existingRequest = null;
    if (data.title && data.title.trim() !== '') {
      existingRequest = await prisma.songRequest.findFirst({
        where: {
          title: {
            equals: data.title,
          },
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
    }

    if (existingRequest && data.request_type === '노래') {
      return NextResponse.json(
        { error: '이 곡은 오늘 이미 신청되었습니다.' },
        { status: 400 }
      );
    }

    const newRequest = await prisma.songRequest.create({
      data: {
        title: data.title || '',
        artist: data.artist || '',
        story: data.story || '',
        genre: data.genre || '기타',
        requester: data.requester,
        is_anonymous: data.is_anonymous || false,
        request_type: data.request_type || '노래',
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
