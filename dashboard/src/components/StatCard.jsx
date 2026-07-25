export default function StatCard({ label, value, accent = 'text-ink', icon: Icon, tone = 'primary' }) {
  const toneStyles = {
    primary: 'bg-primary-soft text-primary',
    danger: 'bg-danger-soft text-danger',
    success: 'bg-success-soft text-success',
  };

  return (
    <div className="bg-card border border-line rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-ink-soft uppercase tracking-wide font-medium">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneStyles[tone]}`}>
            <Icon size={16} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
