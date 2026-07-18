import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];
const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#dc2626',
};

export default function SeverityChart({ incidents }) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const incident of incidents) {
    counts[incident.severity] = (counts[incident.severity] || 0) + 1;
  }

  const data = {
    labels: SEVERITY_ORDER,
    datasets: [
      {
        data: SEVERITY_ORDER.map((s) => counts[s]),
        backgroundColor: SEVERITY_ORDER.map((s) => SEVERITY_COLORS[s]),
        borderColor: '#0f172a',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8' } },
    },
  };

  if (incidents.length === 0) {
    return <p className="text-slate-600 text-sm py-8 text-center">No incident data yet.</p>;
  }

  return <Doughnut data={data} options={options} />;
}
