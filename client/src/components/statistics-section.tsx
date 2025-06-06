export function StatisticsSection() {
  const stats = [
    { value: "50,000+", label: "Active Intercessors" },
    { value: "120+", label: "Countries Reached" },
    { value: "1M+", label: "Prayer Hours Logged" },
    { value: "500+", label: "Global Events" }
  ];

  return (
    <section className="py-20 bg-brand-primary text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Global Impact</h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            See how our community is making a difference around the world through unified prayer and fellowship.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-brand-accent mb-2">{stat.value}</div>
              <div className="text-lg text-gray-200">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
