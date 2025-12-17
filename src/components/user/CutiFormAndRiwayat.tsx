import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
function CutiFormAndRiwayat() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ type: '', startDate: '', endDate: '', reason: '', document: null });
  const [uploading, setUploading] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/leave', {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    try {
      let documentUrl = '';
      if (form.document) {
        documentUrl = URL.createObjectURL(form.document);
      }
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...form, documentUrl })
      });
      if (res.ok) {
        setSuccess('Pengajuan cuti berhasil');
        setForm({ type: '', startDate: '', endDate: '', reason: '', document: null });
        fetchLeaves();
      } else {
        setError((await res.json()).message || 'Gagal mengajukan cuti');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <form className="mb-6 space-y-2" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Jenis Cuti</label>
            <select className="w-full border rounded px-2 py-1" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required>
              <option value="">Pilih jenis cuti</option>
              <option value="ANNUAL">Cuti Tahunan</option>
              <option value="MATERNITY">Cuti Hamil</option>
              <option value="SICK">Cuti Sakit</option>
              <option value="FAMILY_SICK">Cuti Keluarga Sakit</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Tanggal Mulai</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
          </div>
          <div>
            <label className="block mb-1">Tanggal Selesai</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
          </div>
          <div>
            <label className="block mb-1">Alasan</label>
            <input className="w-full border rounded px-2 py-1" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className="block mb-1">Upload Dokumen (PDF/JPG, opsional)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm(f => ({ ...f, document: e.target.files?.[0] || null }))} />
          </div>
        </div>
        <Button type="submit" disabled={uploading}>Ajukan Cuti</Button>
      </form>
      <h3 className="font-medium mb-2">Riwayat Pengajuan Cuti</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Jenis</th>
            <th className="text-left p-2">Tanggal</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Dokumen</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="p-2">{l.type}</td>
              <td className="p-2">{l.startDate?.slice(0,10)} s/d {l.endDate?.slice(0,10)}</td>
              <td className="p-2">
                <Badge variant={l.status === 'PENDING' ? 'secondary' : l.status === 'APPROVED' ? 'default' : 'destructive'}>
                  {l.status}
                </Badge>
              </td>
              <td className="p-2">
                {l.documentUrl ? <a href={l.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Lihat</a> : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default CutiFormAndRiwayat;
