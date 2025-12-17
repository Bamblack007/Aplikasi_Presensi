'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Camera, CameraOff, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

// Tipe data
interface User {
  name: string;
  // tambahkan field lain jika perlu
}
interface OfficeLocation {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}
interface Attendance {
  id: string;
  photoUrl: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  createdAt: string;
  latitude: number;
  longitude: number;
}
interface LatLng {
  lat: number;
  lng: number;
}

export default function UserPage() {
  // State dan ref dengan tipe
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [useFileInput, setUseFileInput] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Hooks
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    fetchData();
  }, []);

  // Fetch data user, lokasi kantor, dan riwayat presensi
  async function fetchData() {
    setIsLoading(true);
    setError('');
    try {
      // Fetch user
      const userRes = await fetch('/api/user/me');
      if (userRes.ok) {
        setCurrentUser(await userRes.json());
      }
      // Fetch lokasi kantor
      const locRes = await fetch('/api/user/office-location');
      if (locRes.ok) {
        setOfficeLocation(await locRes.json());
      }
      // Fetch riwayat presensi
      const attRes = await fetch('/api/user/attendances');
      if (attRes.ok) {
        setAttendances(await attRes.json());
      }
    } catch (e) {
      setError('Gagal memuat data user');
    } finally {
      setIsLoading(false);
    }
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  // Kamera
  async function startCamera() {
    setIsLoadingCamera(true);
    setError('');
    setUseFileInput(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Kamera tidak didukung di browser ini.');
        setUseFileInput(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err) {
      setError('Tidak dapat mengakses kamera. Izinkan akses kamera di browser.');
      setUseFileInput(true);
    } finally {
      setIsLoadingCamera(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setCapturedImage('');
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setError('');
        setIsCameraOn(false);
      };
      reader.readAsDataURL(file);
    }
  }

  function toggleCameraMode() {
    setUseFileInput(!useFileInput);
    setError('');
    setIsCameraOn(false);
    setCapturedImage('');
    stopCamera();
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Video belum siap. Tunggu sebentar dan coba lagi.');
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0);
        ctx.restore();
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      } else {
        setError('Canvas context tidak tersedia');
      }
    } else {
      setError('Video atau canvas element tidak tersedia');
    }
  }

  // Lokasi
  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        if (officeLocation) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            officeLocation.latitude,
            officeLocation.longitude
          );
          setIsWithinRadius(distance <= officeLocation.radius);
        }
      },
      () => {
        setError('Tidak dapat mendapatkan lokasi. Pastikan GPS diizinkan.');
      }
    );
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Submit presensi
  async function submitAttendance(type) {
    if (!capturedImage) {
      setError('Silakan ambil foto terlebih dahulu');
      return;
    }
    if (!userLocation) {
      setError('Silakan dapatkan lokasi terlebih dahulu');
      return;
    }
    if (isWithinRadius === false) {
      setError('Anda berada di luar radius presensi');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
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
      });
      if (response.ok) {
        setSuccess(`Presensi ${type === 'CHECK_IN' ? 'masuk' : 'keluar'} berhasil`);
        setCapturedImage('');
        setUserLocation(null);
        setIsWithinRadius(null);
        fetchData();
      } else {
        const error = await response.json();
        setError(error.message || 'Gagal melakukan presensi');
      }
    } catch (err) {
      setError('Gagal melakukan presensi');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
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
                    Ambil foto selfie untuk presensi. <br />
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
                      {/* Always render video element but hide when not in use */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        controls={false}
                        className={`w-full h-full object-cover ${isCameraOn ? '' : 'hidden'}`}
                        style={{ transform: isCameraOn ? 'scaleX(-1)' : 'none' }}
                      />
                      {capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                      ) : !isCameraOn ? (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                          <div className="text-center">
                            <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">
                              {useFileInput ? 'Klik "Pilih Foto" untuk memilih dari galeri' : 'Kamera belum diaktifkan'}
                            </p>
                          </div>
                        </div>
                      ) : null}
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
  );
}