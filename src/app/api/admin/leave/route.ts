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

// GET: List all leave requests for approval (admin only)
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const leaves = await db.leave.findMany({
      where: { status: 'PENDING' },
      include: { user: true, approval: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(leaves);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH: Approve or reject leave (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { leaveId, approved, notes } = await request.json();
    if (!leaveId || typeof approved !== 'boolean') {
      return NextResponse.json({ message: 'Field tidak lengkap' }, { status: 400 });
    }
    // Update leave status
    const leave = await db.leave.update({
      where: { id: leaveId },
      data: { status: approved ? 'APPROVED' : 'REJECTED' }
    });
    // Create approval log
    await db.leaveApproval.create({
      data: {
        leaveId,
        adminId: decoded.userId,
        approved,
        notes: notes || null
      }
    });
    return NextResponse.json({ message: 'Approval berhasil', leave });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
