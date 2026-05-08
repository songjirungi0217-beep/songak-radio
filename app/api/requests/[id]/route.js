import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!['대기', '선곡', '완료'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedRequest = await prisma.songRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
