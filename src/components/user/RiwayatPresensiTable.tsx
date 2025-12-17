import { useEffect, useState } from 'react';
function RiwayatPresensiTable() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAttendances = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/attendances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAttendances(await res.json());
      } else {
        setError('Gagal memuat data presensi');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendances(); }, []);

  return (
    <div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Tanggal</th>
            <th className="text-left p-2">Tipe</th>
            <th className="text-left p-2">Jam</th>
            <th className="text-left p-2">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {attendances.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.createdAt?.slice(0,10)}</td>
              <td className="p-2">{a.type}</td>
              <td className="p-2">{a.createdAt?.slice(11,16)}</td>
              <td className="p-2">{a.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default RiwayatPresensiTable;
