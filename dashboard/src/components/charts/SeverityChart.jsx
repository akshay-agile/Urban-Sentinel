import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];
const SEVERITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
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
        borderColor: '#FFFFFF',
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#64748B', font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
      },
    },
  };

  if (incidents.length === 0) {
    return <p className="text-ink-muted text-sm py-8 text-center">No incident data yet.</p>;
  }

  return <Doughnut data={data} options={options} />;
}
