'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  MapPin, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  UserPlus,
  Settings
} from 'lucide-react'

interface User {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
}

interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
  isActive: boolean
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER'
  })

  const [editLocation, setEditLocation] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: ''
  })

  useEffect(() => {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      window.location.href = '/'
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'ADMIN') {
      window.location.href = '/user'
      return
    }

    setCurrentUser(userData)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch users
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Fetch office location
      const locationResponse = await fetch('/api/admin/office-location', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }

      if (locationResponse.ok) {
        const locationData = await locationResponse.json()
        setOfficeLocation(locationData)
        setEditLocation({
          name: locationData.name,
          latitude: locationData.latitude.toString(),
          longitude: locationData.longitude.toString(),
          radius: locationData.radius.toString()
        })
      }
    } catch (err) {
      setError('Gagal memuat data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        setSuccess('User berhasil dibuat')
        setNewUser({ username: '', name: '', password: '', role: 'USER' })
        setShowAddUser(false)
        fetchData()
      } else {
        const error = await response.json()
        setError(error.message || 'Gagal membuat user')
      }
    } catch (err) {
      setError('Gagal membuat user')
    }
  }

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        setSuccess('User berhasil diupdate')
        setEditingUser(null)
        fetchData()
      } else {
        const error = await response.json()
        setError(error.message || 'Gagal mengupdate user')
      }
    } catch (err) {
      setError('Gagal mengupdate user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setSuccess('User berhasil dihapus')
        fetchData()
      } else {
        const error = await response.json()
        setError(error.message || 'Gagal menghapus user')
      }
    } catch (err) {
      setError('Gagal menghapus user')
    }
  }

  const handleUpdateLocation = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/office-location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editLocation.name,
          latitude: parseFloat(editLocation.latitude),
          longitude: parseFloat(editLocation.longitude),
          radius: parseFloat(editLocation.radius)
        })
      })

      if (response.ok) {
        setSuccess('Lokasi kantor berhasil diupdate')
        fetchData()
      } else {
        const error = await response.json()
        setError(error.message || 'Gagal mengupdate lokasi kantor')
      }
    } catch (err) {
      setError('Gagal mengupdate lokasi kantor')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
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
              <Settings className="w-6 h-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Dashboard Admin</h1>
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

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Manajemen User
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Lokasi Presensi
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Manajemen User</CardTitle>
                    <CardDescription>Kelola akun pegawai</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddUser(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Add User Form */}
                {showAddUser && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium mb-4">Tambah User Baru</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-username">Username</Label>
                        <Input
                          id="new-username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                          placeholder="Username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-name">Nama Lengkap</Label>
                        <Input
                          id="new-name"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="Nama lengkap"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="Password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-role">Role</Label>
                        <select
                          id="new-role"
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value as 'ADMIN' | 'USER'})}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button onClick={handleCreateUser}>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Batal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Users List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Username</th>
                        <th className="text-left p-2">Nama</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2">{user.username}</td>
                          <td className="p-2">{user.name}</td>
                          <td className="p-2">
                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant={user.isActive ? 'default' : 'destructive'}>
                              {user.isActive ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Lokasi Presensi</CardTitle>
                <CardDescription>Atur titik koordinat dan radius presensi</CardDescription>
              </CardHeader>
              <CardContent>
                {officeLocation && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location-name">Nama Lokasi</Label>
                        <Input
                          id="location-name"
                          value={editLocation.name}
                          onChange={(e) => setEditLocation({...editLocation, name: e.target.value})}
                          placeholder="Nama lokasi"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-radius">Radius (meter)</Label>
                        <Input
                          id="location-radius"
                          type="number"
                          value={editLocation.radius}
                          onChange={(e) => setEditLocation({...editLocation, radius: e.target.value})}
                          placeholder="Radius dalam meter"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-lat">Latitude</Label>
                        <Input
                          id="location-lat"
                          type="number"
                          step="any"
                          value={editLocation.latitude}
                          onChange={(e) => setEditLocation({...editLocation, latitude: e.target.value})}
                          placeholder="Latitude"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-lng">Longitude</Label>
                        <Input
                          id="location-lng"
                          type="number"
                          step="any"
                          value={editLocation.longitude}
                          onChange={(e) => setEditLocation({...editLocation, longitude: e.target.value})}
                          placeholder="Longitude"
                        />
                      </div>
                    </div>
                    <Button onClick={handleUpdateLocation}>
                      <Save className="w-4 h-4 mr-2" />
                      Update Lokasi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}