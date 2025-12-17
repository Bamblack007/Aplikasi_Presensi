import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
function ApprovalCutiCrud() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/leave', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLeaves(await res.json());
      } else {
        setError('Gagal memuat data cuti');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleApprove = async (id, approved) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ leaveId: id, approved })
      });
      if (res.ok) {
        setSuccess('Cuti berhasil diproses');
        fetchLeaves();
      } else {
        setError((await res.json()).message || 'Gagal memproses cuti');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Nama</th>
            <th className="text-left p-2">Jenis</th>
            <th className="text-left p-2">Tanggal</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="p-2">{l.user?.name}</td>
              <td className="p-2">{l.type}</td>
              <td className="p-2">{l.startDate?.slice(0,10)} s/d {l.endDate?.slice(0,10)}</td>
              <td className="p-2">
                <Badge variant={l.status === 'PENDING' ? 'secondary' : l.status === 'APPROVED' ? 'default' : 'destructive'}>
                  {l.status}
                </Badge>
              </td>
              <td className="p-2">
                {l.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(l.id, true)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleApprove(l.id, false)}>Reject</Button>
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
export default ApprovalCutiCrud;
