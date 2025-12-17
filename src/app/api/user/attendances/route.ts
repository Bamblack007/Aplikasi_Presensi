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

    // --- Tambahan validasi berbasis jadwal & shift ---
    // Ambil jadwal kerja aktif user untuk hari ini
    const now = new Date();
    const todaySchedule = await db.workSchedule.findFirst({
      where: {
        userId: decoded.userId,
        workDate: today,
        isOff: false
      },
      include: {
        shift: true,
        department: true
      }
    });

    if (!todaySchedule) {
      return NextResponse.json(
        { message: 'Anda tidak memiliki jadwal kerja aktif hari ini.' },
        { status: 400 }
      );
    }

    // Tentukan jam masuk & keluar dari shift/jadwal
    let startTime = todaySchedule.shift ? todaySchedule.shift.startTime : new Date(todaySchedule.workDate.setHours(7,0,0,0));
    let endTime = todaySchedule.shift ? todaySchedule.shift.endTime : new Date(todaySchedule.workDate.setHours(17,0,0,0));
    let checkInWindow = new Date(startTime);
    let checkOutWindow = new Date(endTime);

    // Atur window check-in/check-out sesuai departemen/shift
    if (todaySchedule.department.name === 'Sekuriti') {
      if (todaySchedule.shift && todaySchedule.shift.name === 'Pagi') {
        checkInWindow.setHours(6,0,0,0);
        checkOutWindow.setHours(23,59,59,999);
      } else if (todaySchedule.shift && todaySchedule.shift.name === 'Malam') {
        checkInWindow.setHours(18,0,0,0);
        checkOutWindow = new Date(endTime);
        checkOutWindow.setHours(10,0,0,0); // 2 jam setelah selesai shift
      }
    } else if (todaySchedule.department.name === 'Resepsionis') {
      checkInWindow.setHours(5,30,0,0);
      checkOutWindow.setHours(23,59,59,999);
    } else if (todaySchedule.department.name === 'Pramubakti') {
      checkInWindow.setHours(5,0,0,0);
      checkOutWindow.setHours(23,59,59,999);
    }

    // Validasi window waktu presensi
    if (type === 'CHECK_IN' && now < checkInWindow) {
      return NextResponse.json(
        { message: 'Check-in belum dibuka.' },
        { status: 400 }
      );
    }
    if (type === 'CHECK_OUT' && now > checkOutWindow) {
      return NextResponse.json(
        { message: 'Check-out sudah melewati batas waktu.' },
        { status: 400 }
      );
    }

    // --- Status presensi & potongan otomatis ---
    let status = 'HADIR';
    let deduction = 0;
    if (type === 'CHECK_IN') {
      const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
      if (diffMinutes > 0 && diffMinutes <= 30) {
        status = 'TERLAMBAT';
        deduction = 25000;
      } else if (diffMinutes > 30 && diffMinutes <= 60) {
        status = 'TERLAMBAT';
        deduction = 50000;
      } else if (diffMinutes > 60) {
        status = 'TERLAMBAT';
        deduction = 75000;
      }
    }

    // Simpan presensi
    const attendance = await db.attendance.create({
      data: {
        userId: decoded.userId,
        type: type.toUpperCase(),
        photoUrl,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        notes: notes || null
        // Tambahkan field status jika sudah ada di model Attendance
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      }
    });

    // Simpan potongan jika ada keterlambatan
    if (deduction > 0) {
      await db.payrollDeduction.create({
        data: {
          payroll: {
            connectOrCreate: {
              where: {
                userId_month_year: {
                  userId: decoded.userId,
                  month: now.getMonth() + 1,
                  year: now.getFullYear()
                }
              },
              create: {
                userId: decoded.userId,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                baseSalary: 0
              }
            }
          },
          type: 'LATE',
          amount: deduction,
          notes: status
        }
      });
    }

    return NextResponse.json({
      message: 'Presensi berhasil',
      attendance,
      status,
      deduction
    });
  } catch (error) {
    console.error('Create attendance error:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}