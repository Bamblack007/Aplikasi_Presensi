import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// GET office location
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request)
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const officeLocation = await db.officeLocation.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!officeLocation) {
      return NextResponse.json(
        { message: 'Lokasi kantor belum diatur' },
        { status: 404 }
      )
    }

    return NextResponse.json(officeLocation)
  } catch (error) {
    console.error('Get office location error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT update office location
export async function PUT(request: NextRequest) {
  try {
    const decoded = verifyToken(request)
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, latitude, longitude, radius } = await request.json()

    if (!name || !latitude || !longitude || !radius) {
      return NextResponse.json(
        { message: 'Semua field harus diisi' },
        { status: 400 }
      )
    }

    // Check if office location exists
    const existingLocation = await db.officeLocation.findFirst({
      where: { isActive: true }
    })

    let officeLocation
    if (existingLocation) {
      // Update existing location
      officeLocation = await db.officeLocation.update({
        where: { id: existingLocation.id },
        data: {
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius)
        }
      })
    } else {
      // Create new location
      officeLocation = await db.officeLocation.create({
        data: {
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius)
        }
      })
    }

    return NextResponse.json({
      message: 'Lokasi kantor berhasil diupdate',
      officeLocation
    })
  } catch (error) {
    console.error('Update office location error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}