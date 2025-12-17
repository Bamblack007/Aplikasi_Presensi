import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// GET: List all leave requests for the user
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const leaves = await db.leave.findMany({
      where: { userId: decoded.userId },
      include: { approval: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(leaves);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST: Submit a new leave request
export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { type, startDate, endDate, reason, documentUrl } = await request.json();
    if (!type || !startDate || !endDate) {
      return NextResponse.json({ message: 'Field tidak lengkap' }, { status: 400 });
    }
    // Validasi cuti tahunan, khusus, dan aturan lain bisa ditambah di sini
    const leave = await db.leave.create({
      data: {
        userId: decoded.userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        documentUrl: documentUrl || null
      }
    });
    return NextResponse.json({ message: 'Pengajuan cuti berhasil', leave });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
