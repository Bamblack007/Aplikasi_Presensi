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

// GET: List payroll for admin or user
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    let payrolls;
    if (decoded.role === 'ADMIN') {
      payrolls = await db.payroll.findMany({
        include: { user: true, deductions: true },
        orderBy: { year: 'desc', month: 'desc' }
      });
    } else {
      payrolls = await db.payroll.findMany({
        where: { userId: decoded.userId },
        include: { deductions: true },
        orderBy: { year: 'desc', month: 'desc' }
      });
    }
    return NextResponse.json(payrolls);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH: Lock payroll (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { payrollId, isLocked } = await request.json();
    if (!payrollId || typeof isLocked !== 'boolean') {
      return NextResponse.json({ message: 'Field tidak lengkap' }, { status: 400 });
    }
    const payroll = await db.payroll.update({
      where: { id: payrollId },
      data: { isLocked }
    });
    return NextResponse.json({ message: 'Payroll updated', payroll });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
