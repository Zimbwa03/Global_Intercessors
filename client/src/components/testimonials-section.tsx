export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Mary Johnson",
      location: "Nigeria",
      initials: "MJ",
      content: "Global Intercessors has transformed my prayer life. The AI tools help me structure my prayers, and knowing I'm part of a worldwide movement gives me such strength."
    },
    {
      name: "David Kim",
      location: "South Korea",
      initials: "DK",
      content: "The global events feature has connected me with believers I never would have met. It's amazing to pray together across time zones and cultures."
    },
    {
      name: "Sarah Rodriguez",
      location: "Mexico",
      initials: "SR",
      content: "Tracking my prayer attendance has been eye-opening. I can see my spiritual growth over time, and it motivates me to be more consistent in my walk with God."
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">What Our Community Says</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Hear from intercessors around the world about their transformative experiences with our platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-brand-neutral rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center mr-4">
                  <span className="text-brand-accent font-bold text-lg">{testimonial.initials}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.location}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                {testimonial.content}
              </p>
              <div className="flex text-brand-accent">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className="fas fa-star"></i>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
