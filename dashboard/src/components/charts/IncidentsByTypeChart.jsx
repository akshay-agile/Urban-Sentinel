import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function IncidentsByTypeChart({ incidents }) {
  const counts = {};
  for (const incident of incidents) {
    counts[incident.incident_type] = (counts[incident.incident_type] || 0) + 1;
  }
  const labels = Object.keys(counts).map((t) => t.replace('_', ' '));

  const data = {
    labels,
    datasets: [
      {
        label: 'Incidents',
        data: Object.values(counts),
        backgroundColor: '#dc2626',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' }, beginAtZero: true },
    },
  };

  if (incidents.length === 0) {
    return <p className="text-slate-600 text-sm py-8 text-center">No incident data yet.</p>;
  }

  return <Bar data={data} options={options} />;
}
