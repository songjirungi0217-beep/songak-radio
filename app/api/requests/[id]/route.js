import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session';

async function requireAdmin() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSession(token);
}

export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const id = Number(params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body && typeof body === 'object' ? body.status : undefined;

    if (!['대기', '선곡', '완료'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedRequest = await prisma.songRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: '신청을 찾을 수 없습니다.' }, { status: 404 });
    }
    console.error('Failed to update request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const id = Number(params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.songRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: '신청을 찾을 수 없습니다.' }, { status: 404 });
    }
    console.error('Failed to delete request:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
