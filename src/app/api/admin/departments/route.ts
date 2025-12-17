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

// GET all departments
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const departments = await db.department.findMany({
      include: { users: { select: { id: true, name: true, username: true } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(departments);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST create new department
export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Nama departemen harus diisi' }, { status: 400 });
    }
    const existing = await db.department.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ message: 'Departemen sudah ada' }, { status: 400 });
    }
    const department = await db.department.create({ data: { name } });
    return NextResponse.json({ message: 'Departemen berhasil dibuat', department });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
