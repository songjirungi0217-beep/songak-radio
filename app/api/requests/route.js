import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session';

const REQUEST_TYPES = ['노래', '사연'];
const GENRES = ['팝송', '발라드', '힙합', '케이팝', '기타'];
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAILY_REQUEST_LIMIT = 3;
const ANONYMOUS_REQUESTER_COOKIE = 'anonymous_requester_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getKoreaDayRange(now = new Date()) {
  const koreaNow = new Date(now.getTime() + KOREA_OFFSET_MS);
  const startUtc = Date.UTC(
    koreaNow.getUTCFullYear(),
    koreaNow.getUTCMonth(),
    koreaNow.getUTCDate()
  ) - KOREA_OFFSET_MS;

  return { gte: new Date(startUtc), lt: new Date(startUtc + 24 * 60 * 60 * 1000) };
}

function normalizeTitle(title) {
  return title.replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
}

function normalizeApplicant(name) {
  return name.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
}

function getKoreaDateKey(now = new Date()) {
  return new Date(now.getTime() + KOREA_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
}

async function hashApplicant(identity) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function responseWithAnonymousCookie(response, cookieId, shouldSetCookie) {
  if (shouldSetCookie) {
    response.cookies.set(ANONYMOUS_REQUESTER_COOKIE, cookieId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

function requestLimitResponse(cookieId, shouldSetCookie) {
  return responseWithAnonymousCookie(
    NextResponse.json(
      { error: `하루 신청 한도(${DAILY_REQUEST_LIMIT}건)를 모두 사용했습니다.` },
      { status: 429 }
    ),
    cookieId,
    shouldSetCookie
  );
}

function textField(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const request_type = searchParams.get('request_type');
  const session = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const isAdmin = await isValidAdminSession(session);

  if (!isAdmin && (status !== '선곡' || request_type !== '노래')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const whereClause = {};
    if (status) whereClause.status = status;
    if (request_type) whereClause.request_type = request_type;

    const requests = await prisma.songRequest.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });
    if (isAdmin) return NextResponse.json(requests);

    const publicRequests = requests.map(({ id, title, artist, genre, is_anonymous, requester }) => ({
      id,
      title,
      artist,
      genre,
      is_anonymous,
      requester: is_anonymous ? '' : requester,
    }));
    return NextResponse.json(publicRequests);
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16 * 1024) {
    return NextResponse.json({ error: '신청 내용이 너무 큽니다.' }, { status: 413 });
  }

  try {
    const data = await request.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: '신청 내용을 확인해 주세요.' }, { status: 400 });
    }

    const requestType = data.request_type ?? '노래';
    const title = textField(data.title ?? '', 120);
    const artist = textField(data.artist ?? '', 80);
    const story = textField(data.story ?? '', 1000);
    const requester = textField(data.requester ?? '', 40);
    const genre = data.genre ?? '기타';
    const isAnonymous = data.is_anonymous ?? false;

    if (!REQUEST_TYPES.includes(requestType)) {
      return NextResponse.json({ error: '신청 유형을 확인해 주세요.' }, { status: 400 });
    }
    if (title === null || artist === null || story === null || requester === null) {
      return NextResponse.json({ error: '입력 내용이 너무 길거나 올바르지 않습니다.' }, { status: 400 });
    }
    if (!GENRES.includes(genre) || typeof isAnonymous !== 'boolean') {
      return NextResponse.json({ error: '신청 정보를 확인해 주세요.' }, { status: 400 });
    }
    if (requestType === '노래' && (!title || !artist)) {
      return NextResponse.json({ error: '노래 제목과 가수명을 입력해 주세요.' }, { status: 400 });
    }
    if (requestType === '사연' && !story) {
      return NextResponse.json({ error: '사연 내용을 입력해 주세요.' }, { status: 400 });
    }
    if (!isAnonymous && !requester) {
      return NextResponse.json({ error: '신청자 이름을 입력하거나 익명 신청을 선택해 주세요.' }, { status: 400 });
    }

    const now = new Date();
    const dayRange = getKoreaDayRange(now);
    const dayKey = getKoreaDateKey(now);
    const anonymousCookie = isAnonymous ? cookies().get(ANONYMOUS_REQUESTER_COOKIE)?.value : null;
    const anonymousCookieId = isAnonymous && UUID_PATTERN.test(anonymousCookie || '')
      ? anonymousCookie
      : (isAnonymous ? crypto.randomUUID() : null);
    const shouldSetAnonymousCookie = isAnonymous && !UUID_PATTERN.test(anonymousCookie || '');
    const applicantIdentity = isAnonymous
      ? `anonymous:${anonymousCookieId}`
      : `name:${normalizeApplicant(requester)}`;
    const applicantHash = await hashApplicant(applicantIdentity);
    const applicantSlotPrefix = `${dayKey}:${applicantHash}:`;
    const todayRequests = await prisma.songRequest.findMany({
      where: { created_at: dayRange },
      select: {
        title: true,
        requester: true,
        is_anonymous: true,
        request_type: true,
        duplicate_key: true,
        applicant_slot_key: true,
      },
    });

    if (requestType === '노래') {
      const normalizedNewTitle = normalizeTitle(title);
      const isDuplicate = todayRequests.some(req =>
        req.request_type === '노래' && normalizeTitle(req.title) === normalizedNewTitle
      );

      if (isDuplicate) {
        return responseWithAnonymousCookie(
          NextResponse.json({ error: '이 곡은 오늘 이미 신청되었습니다.' }, { status: 400 }),
          anonymousCookieId,
          shouldSetAnonymousCookie
        );
      }
    }

    const applicantRequests = todayRequests.filter(req => isAnonymous
      ? Boolean(req.applicant_slot_key?.startsWith(applicantSlotPrefix))
      : !req.is_anonymous && normalizeApplicant(req.requester) === normalizeApplicant(requester)
    );
    const usedSlots = new Set();
    let legacyRequestCount = 0;

    for (const existing of applicantRequests) {
      if (existing.applicant_slot_key?.startsWith(applicantSlotPrefix)) {
        const slot = Number(existing.applicant_slot_key.slice(applicantSlotPrefix.length));
        if (Number.isInteger(slot) && slot >= 1 && slot <= DAILY_REQUEST_LIMIT) usedSlots.add(slot);
      } else if (!existing.applicant_slot_key) {
        legacyRequestCount += 1;
      }
    }

    for (let count = 0; count < legacyRequestCount; count += 1) {
      const freeSlot = [1, 2, 3].find(slot => !usedSlots.has(slot));
      if (!freeSlot) break;
      usedSlots.add(freeSlot);
    }

    const availableSlots = [1, 2, 3].filter(slot => !usedSlots.has(slot));
    if (availableSlots.length === 0) {
      return requestLimitResponse(anonymousCookieId, shouldSetAnonymousCookie);
    }

    const duplicateKey = requestType === '노래'
      ? `${dayKey}:${normalizeTitle(title)}`
      : null;

    for (const slot of availableSlots) {
      const applicantSlotKey = `${applicantSlotPrefix}${slot}`;
      try {
        const newRequest = await prisma.songRequest.create({
          data: {
            title,
            artist,
            story,
            genre,
            requester: isAnonymous ? '' : requester,
            is_anonymous: isAnonymous,
            request_type: requestType,
            duplicate_key: duplicateKey,
            applicant_slot_key: applicantSlotKey,
          },
        });

        return responseWithAnonymousCookie(
          NextResponse.json({ success: true, id: newRequest.id }, { status: 201 }),
          anonymousCookieId,
          shouldSetAnonymousCookie
        );
      } catch (error) {
        if (error?.code !== 'P2002') throw error;

        if (duplicateKey) {
          const duplicate = await prisma.songRequest.findUnique({
            where: { duplicate_key: duplicateKey },
            select: { id: true },
          });
          if (duplicate) {
            return responseWithAnonymousCookie(
              NextResponse.json({ error: '이 곡은 오늘 이미 신청되었습니다.' }, { status: 400 }),
              anonymousCookieId,
              shouldSetAnonymousCookie
            );
          }
        }

        const slotOwner = await prisma.songRequest.findUnique({
          where: { applicant_slot_key: applicantSlotKey },
          select: { id: true },
        });
        if (!slotOwner) throw error;
      }
    }

    return requestLimitResponse(anonymousCookieId, shouldSetAnonymousCookie);
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '이 곡은 오늘 이미 신청되었습니다.' },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: '신청 내용을 확인해 주세요.' }, { status: 400 });
    }
    console.error('Failed to create request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
