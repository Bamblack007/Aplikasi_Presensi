import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
function DepartmentCrud() {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDeptName, setEditDeptName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDepartments(await res.json());
      } else {
        setError('Gagal memuat departemen');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleAdd = async () => {
    if (!newDept) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newDept })
      });
      if (res.ok) {
        setSuccess('Departemen berhasil ditambah');
        setNewDept('');
        fetchDepartments();
      } else {
        setError((await res.json()).message || 'Gagal menambah departemen');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditDeptId(id);
    setEditDeptName(name);
  };

  const handleUpdate = async () => {
    if (!editDeptId || !editDeptName) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/departments/${editDeptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editDeptName })
      });
      if (res.ok) {
        setSuccess('Departemen berhasil diupdate');
        setEditDeptId('');
        setEditDeptName('');
        fetchDepartments();
      } else {
        setError((await res.json()).message || 'Gagal update departemen');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin hapus departemen?')) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess('Departemen berhasil dihapus');
        fetchDepartments();
      } else {
        setError((await res.json()).message || 'Gagal hapus departemen');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <div className="flex space-x-2 mb-4">
        <input
          className="border rounded px-2 py-1"
          placeholder="Nama departemen baru"
          value={newDept}
          onChange={e => setNewDept(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={loading}>Tambah</Button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Nama Departemen</th>
            <th className="text-left p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d: any) => (
            <tr key={d.id} className="border-b">
              <td className="p-2">
                {editDeptId === d.id ? (
                  <input
                    className="border rounded px-2 py-1"
                    value={editDeptName}
                    onChange={e => setEditDeptName(e.target.value)}
                  />
                ) : (
                  d.name
                )}
              </td>
              <td className="p-2">
                {editDeptId === d.id ? (
                  <>
                    <Button size="sm" onClick={handleUpdate} disabled={loading}>Simpan</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditDeptId(''); setEditDeptName(''); }}>Batal</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(d.id, d.name)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(d.id)}>Hapus</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default DepartmentCrud;
