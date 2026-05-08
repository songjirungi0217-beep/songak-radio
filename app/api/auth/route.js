import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  const { password } = await request.json();
  
  if (password === process.env.ADMIN_PASSWORD) {
    cookies().set('admin_token', password, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
}
