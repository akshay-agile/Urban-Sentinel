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
        backgroundColor: '#2563EB',
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
      },
    },
    scales: {
      x: { ticks: { color: '#64748B', font: { family: 'Inter', size: 12 } }, grid: { display: false } },
      y: {
        ticks: { color: '#64748B', stepSize: 1, font: { family: 'Inter', size: 12 } },
        grid: { color: '#E2E8F0' },
        beginAtZero: true,
      },
    },
  };

  if (incidents.length === 0) {
    return <p className="text-ink-muted text-sm py-8 text-center">No incident data yet.</p>;
  }

  return <Bar data={data} options={options} />;
}
