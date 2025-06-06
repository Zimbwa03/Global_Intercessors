export function StatisticsSection() {
  const stats = [
    { value: "50,000+", label: "Active Intercessors" },
    { value: "120+", label: "Countries Reached" },
    { value: "1M+", label: "Prayer Hours Logged" },
    { value: "500+", label: "Global Events" }
  ];

  return (
    <section className="py-20 bg-brand-primary text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-800/50 to-blue-900/30"></div>
      <div className="container mx-auto px-6 relative">
        <div className="text-center mb-16">
          <h2 className="font-poppins text-4xl md:text-5xl font-bold mb-6">Global Impact</h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            See how our community is making a difference around the world through unified prayer and fellowship.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-brand shadow-brand">
                <div className="text-4xl md:text-5xl font-bold text-brand-accent mb-2 font-poppins group-hover:scale-110 transition-brand">{stat.value}</div>
                <div className="text-lg text-blue-100 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
