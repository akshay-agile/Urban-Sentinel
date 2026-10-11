import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { DASHBOARD_COLORS, getIncidentTypeColor } from '../../theme';

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
        backgroundColor: Object.keys(counts).map(getIncidentTypeColor),
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: DASHBOARD_COLORS.card,
        borderColor: DASHBOARD_COLORS.border,
        borderWidth: 1,
        titleColor: DASHBOARD_COLORS.text,
        bodyColor: DASHBOARD_COLORS.text,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Incident count', color: DASHBOARD_COLORS.textMuted, font: { family: 'Inter', size: 11 } },
        ticks: { color: DASHBOARD_COLORS.textMuted, precision: 0, font: { family: 'Inter', size: 11 } },
        grid: { color: DASHBOARD_COLORS.border },
        beginAtZero: true,
      },
      y: {
        title: { display: true, text: 'Hazard type', color: DASHBOARD_COLORS.textMuted, font: { family: 'Inter', size: 11 } },
        ticks: { color: DASHBOARD_COLORS.textMuted, font: { family: 'Inter', size: 11 } },
        grid: { display: false },
      },
    },
  };

  if (incidents.length === 0) {
    return <p className="text-ink-muted text-sm py-8 text-center">No incident data yet.</p>;
  }

  return <Bar data={data} options={{ ...options, indexAxis: 'y' }} />;
}
