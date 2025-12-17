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

// GET: List all shifts and schedules (admin only)
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const shifts = await db.shift.findMany({
      include: { schedules: { include: { user: true, department: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(shifts);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST: Create or update shift and schedule (admin only)
export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { name, startTime, endTime, userId, departmentId, workDate, isOff } = await request.json();
    if (!name || !startTime || !endTime || !userId || !departmentId || !workDate) {
      return NextResponse.json({ message: 'Field tidak lengkap' }, { status: 400 });
    }
    // Create or update shift
    let shift = await db.shift.findFirst({ where: { name, startTime: new Date(startTime), endTime: new Date(endTime) } });
    if (!shift) {
      shift = await db.shift.create({ data: { name, startTime: new Date(startTime), endTime: new Date(endTime) } });
    }
    // Create or update schedule
    const schedule = await db.workSchedule.upsert({
      where: { userId_workDate: { userId, workDate: new Date(workDate) } },
      update: { shiftId: shift.id, departmentId, isOff: !!isOff },
      create: { userId, departmentId, shiftId: shift.id, workDate: new Date(workDate), isOff: !!isOff }
    });
    return NextResponse.json({ message: 'Jadwal shift berhasil diatur', schedule });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
