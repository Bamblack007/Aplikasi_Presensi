import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
function RekapPayrollTable() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchPayrolls = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/payroll?month=${month}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPayrolls(await res.json());
      } else {
        setError('Gagal memuat data payroll');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayrolls(); }, [month, year]);

  const handleExport = () => {
    alert('Fitur export laporan belum diimplementasikan.');
  };

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1">
          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
        <Button onClick={handleExport}>Export PDF/Excel</Button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Nama</th>
            <th className="text-left p-2">Gaji Pokok</th>
            <th className="text-left p-2">Potongan</th>
            <th className="text-left p-2">Gaji Bersih</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {payrolls.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.user?.name}</td>
              <td className="p-2">Rp{p.baseSalary?.toLocaleString()}</td>
              <td className="p-2">Rp{p.totalDeduct?.toLocaleString()}</td>
              <td className="p-2">Rp{p.netSalary?.toLocaleString()}</td>
              <td className="p-2">
                <Badge variant={p.isLocked ? 'default' : 'secondary'}>
                  {p.isLocked ? 'Terkunci' : 'Draft'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default RekapPayrollTable;
