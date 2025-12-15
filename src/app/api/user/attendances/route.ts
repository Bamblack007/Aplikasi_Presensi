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

// GET user attendances
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const attendances = await db.attendance.findMany({
      where: { userId: decoded.userId },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(attendances)
  } catch (error) {
    console.error('Get attendances error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST create new attendance
export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { type, photoUrl, latitude, longitude, notes } = await request.json()

    if (!type || !photoUrl || !latitude || !longitude) {
      return NextResponse.json(
        { message: 'Semua field harus diisi' },
        { status: 400 }
      )
    }

    // Get office location to check radius
    const officeLocation = await db.officeLocation.findFirst({
      where: { isActive: true }
    })

    if (!officeLocation) {
      return NextResponse.json(
        { message: 'Lokasi kantor belum diatur' },
        { status: 400 }
      )
    }

    // Calculate distance from office
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3 // Earth's radius in meters
      const φ1 = lat1 * Math.PI/180
      const φ2 = lat2 * Math.PI/180
      const Δφ = (lat2-lat1) * Math.PI/180
      const Δλ = (lon2-lon1) * Math.PI/180

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

      return R * c // Distance in meters
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      officeLocation.latitude,
      officeLocation.longitude
    )

    // Check if within radius
    if (distance > officeLocation.radius) {
      return NextResponse.json(
        { message: `Anda berada di luar radius presensi. Jarak: ${Math.round(distance)}m, Radius: ${officeLocation.radius}m` },
        { status: 400 }
      )
    }

    // Check if already has same type attendance today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingAttendance = await db.attendance.findFirst({
      where: {
        userId: decoded.userId,
        type: type.toUpperCase(),
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    if (existingAttendance) {
      return NextResponse.json(
        { message: `Anda sudah melakukan ${type === 'CHECK_IN' ? 'check in' : 'check out'} hari ini` },
        { status: 400 }
      )
    }

    // Create attendance
    const attendance = await db.attendance.create({
      data: {
        userId: decoded.userId,
        type: type.toUpperCase(),
        photoUrl,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        notes: notes || null
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Presensi berhasil',
      attendance
    })
  } catch (error) {
    console.error('Create attendance error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}