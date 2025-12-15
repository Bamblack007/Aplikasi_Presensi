'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Camera, 
  MapPin, 
  LogOut, 
  Clock, 
  CameraOff,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react'

interface Attendance {
  id: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  photoUrl: string
  latitude: number
  longitude: number
  notes?: string
  createdAt: string
}

interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

export default function UserDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [useFileInput, setUseFileInput] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobile = isMobileDevice || (window.innerWidth <= 768 && isTouchDevice)
      
      setIsMobile(isMobile)
      // For mobile devices, prefer file input over WebRTC
      setUseFileInput(isMobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      window.location.href = '/'
      return
    }

    const userData = JSON.parse(user)
    if (userData.role === 'ADMIN') {
      window.location.href = '/admin'
      return
    }

    setCurrentUser(userData)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch attendances
      const attendancesResponse = await fetch('/api/user/attendances', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Fetch office location
      const locationResponse = await fetch('/api/user/office-location', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (attendancesResponse.ok) {
        const attendancesData = await attendancesResponse.json()
        setAttendances(attendancesData)
      }

      if (locationResponse.ok) {
        const locationData = await locationResponse.json()
        setOfficeLocation(locationData)
      }
    } catch (err) {
      setError('Gagal memuat data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  const startCamera = async () => {
    if (useFileInput) {
      // For mobile: use file input with capture
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
      return
    }

    // For desktop: use WebRTC
    try {
      setIsLoadingCamera(true)
      setError('')

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung di browser ini')
      }

      // Request camera permission with simpler constraints for mobile compatibility
      const constraints = {
        video: {
          facingMode: 'user', // Front camera for selfie
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }

      console.log('Requesting camera access with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      console.log('Camera stream obtained:', stream)
      
      if (videoRef.current) {
        // Ensure video element is ready
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded')
              resolve(void 0)
            }
          }
        })
        
        setIsCameraOn(true)
        setError('')
      } else {
        throw new Error('Video element tidak tersedia')
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      let errorMessage = 'Tidak dapat mengakses kamera.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Akses kamera ditolak. Berikan izin kamera di browser dan coba lagi.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.'
      } else if (err.name === 'NotSupportedError' || err.name === 'NotSupportedError') {
        errorMessage = 'Kamera tidak didukung di browser ini. Coba browser lain.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Kamera sedang digunakan aplikasi lain atau ada masalah hardware.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Kamera tidak mendukung pengaturan yang diminta.'
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Akses kamera diblokir karena masalah keamanan. Pastikan menggunakan HTTPS.'
      } else if (err.message) {
        errorMessage = `Error kamera: ${err.message}`
      }
      
      setError(errorMessage)
      // Fallback to file input on error
      setUseFileInput(true)
    } finally {
      setIsLoadingCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setCapturedImage('')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setCapturedImage(result)
        setError('')
        setIsCameraOn(false) // Set to false since we're using file input
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleCameraMode = () => {
    setUseFileInput(!useFileInput)
    setError('')
    setIsCameraOn(false)
    setCapturedImage('')
    stopCamera()
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        
        // Check if within radius
        if (officeLocation) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            officeLocation.latitude,
            officeLocation.longitude
          )
          setIsWithinRadius(distance <= officeLocation.radius)
        }
      },
      (error) => {
        setError('Tidak dapat mendapatkan lokasi. Pastikan GPS diizinkan.')
      }
    )
  }

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

  const submitAttendance = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!capturedImage) {
      setError('Silakan ambil foto terlebih dahulu')
      return
    }

    if (!userLocation) {
      setError('Silakan dapatkan lokasi terlebih dahulu')
      return
    }

    if (isWithinRadius === false) {
      setError('Anda berada di luar radius presensi')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/attendances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          photoUrl: capturedImage,
          latitude: userLocation.lat,
          longitude: userLocation.lng
        })
      })

      if (response.ok) {
        setSuccess(`Presensi ${type === 'CHECK_IN' ? 'masuk' : 'keluar'} berhasil`)
        setCapturedImage('')
        setUserLocation(null)
        setIsWithinRadius(null)
        fetchData()
      } else {
        const error = await response.json()
        setError(error.message || 'Gagal melakukan presensi')
      }
    } catch (err) {
      setError('Gagal melakukan presensi')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <User className="w-6 h-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Dashboard User</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendance" className="flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              Presensi
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Riwayat
            </TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Camera Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Foto Selfie</CardTitle>
                  <CardDescription>
                    Ambil foto selfie untuk presensi. 
                    <br />
                    <small className="text-gray-500">
                      Mode: {isMobile ? 'Mobile (File Input)' : 'Desktop (WebRTC)'} 
                      {useFileInput ? ' - Menggunakan file picker' : ' - Menggunakan kamera real-time'}
                    </small>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Camera View */}
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px', aspectRatio: '4/3' }}>
                      {isCameraOn ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          controls={false}
                          className="w-full h-full object-cover"
                          style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie
                        />
                      ) : capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                          <div className="text-center">
                            <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">
                              {useFileInput ? 'Klik "Pilih Foto" untuk memilih dari galeri' : 'Kamera belum diaktifkan'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Hidden canvas for photo capture */}
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Camera Controls */}
                    <div className="space-y-2">
                      {/* Mode Toggle */}
                      <div className="flex justify-center">
                        <Button variant="ghost" size="sm" onClick={toggleCameraMode} className="text-xs">
                          {useFileInput ? 'Mode: File Input' : 'Mode: Real-time Camera'}
                          {!isMobile && ' | Klik untuk ganti'}
                        </Button>
                      </div>

                      <div className="flex space-x-2">
                        {!isCameraOn && !capturedImage && (
                          <Button onClick={startCamera} className="flex-1" disabled={isLoadingCamera}>
                            {isLoadingCamera ? (
                              <>
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {useFileInput ? 'Membuka Galeri...' : 'Membuka Kamera...'}
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                {useFileInput ? 'Pilih Foto' : 'Buka Kamera'}
                              </>
                            )}
                          </Button>
                        )}
                        
                        {isCameraOn && !useFileInput && (
                          <Button onClick={capturePhoto} className="flex-1">
                            <Camera className="w-4 h-4 mr-2" />
                            Ambil Foto
                          </Button>
                        )}
                        
                        {(isCameraOn || capturedImage) && (
                          <Button variant="outline" onClick={stopCamera} className="flex-1">
                            <CameraOff className="w-4 h-4 mr-2" />
                            {capturedImage ? 'Hapus Foto' : 'Tutup Kamera'}
                          </Button>
                        )}
                      </div>

                      {/* Hidden file input for mobile/file mode */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Lokasi Presensi</CardTitle>
                  <CardDescription>Verifikasi lokasi Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Office Location Info */}
                    {officeLocation && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Lokasi Kantor</h4>
                        <p className="text-sm text-blue-700">{officeLocation.name}</p>
                        <p className="text-sm text-blue-700">Radius: {officeLocation.radius} meter</p>
                      </div>
                    )}

                    {/* Get Location Button */}
                    <Button 
                      onClick={getCurrentLocation} 
                      className="w-full"
                      disabled={!officeLocation}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Dapatkan Lokasi Saya
                    </Button>

                    {/* Location Status */}
                    {userLocation && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {isWithinRadius !== null && (
                            isWithinRadius ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )
                          )}
                          <span className={`font-medium ${isWithinRadius ? 'text-green-700' : 'text-red-700'}`}>
                            {isWithinRadius ? 'Anda berada dalam radius presensi' : 'Anda berada di luar radius presensi'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Lat: {userLocation.lat.toFixed(6)}</p>
                          <p>Lng: {userLocation.lng.toFixed(6)}</p>
                        </div>
                      </div>
                    )}

                    {/* Attendance Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => submitAttendance('CHECK_IN')}
                        disabled={isSubmitting || !capturedImage || !userLocation || isWithinRadius === false}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSubmitting ? 'Processing...' : 'Check In'}
                      </Button>
                      <Button 
                        onClick={() => submitAttendance('CHECK_OUT')}
                        disabled={isSubmitting || !capturedImage || !userLocation || isWithinRadius === false}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSubmitting ? 'Processing...' : 'Check Out'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Presensi</CardTitle>
                <CardDescription>Lihat riwayat presensi Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendances.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Belum ada riwayat presensi</p>
                  ) : (
                    <div className="space-y-4">
                      {attendances.map((attendance) => (
                        <div key={attendance.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <img
                              src={attendance.photoUrl}
                              alt="Attendance"
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div>
                              <Badge variant={attendance.type === 'CHECK_IN' ? 'default' : 'secondary'}>
                                {attendance.type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                              </Badge>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(attendance.createdAt).toLocaleString('id-ID')}
                              </p>
                              <p className="text-xs text-gray-500">
                                Lat: {attendance.latitude.toFixed(6)}, Lng: {attendance.longitude.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}