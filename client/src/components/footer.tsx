export function Footer() {
  const quickLinks = [
    { name: "Features", href: "#features" },
    { name: "Events", href: "#" },
    { name: "Community", href: "#" },
    { name: "Resources", href: "#" },
    { name: "Support", href: "#" }
  ];

  const socialLinks = [
    { icon: "fab fa-facebook-f", href: "#" },
    { icon: "fab fa-twitter", href: "#" },
    { icon: "fab fa-instagram", href: "#" },
    { icon: "fab fa-youtube", href: "#" }
  ];

  const contactInfo = [
    { icon: "fas fa-envelope", text: "info@globalintercessors.org" },
    { icon: "fas fa-phone", text: "+1 (555) 123-4567" },
    { icon: "fas fa-map-marker-alt", text: "Global Headquarters" }
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" }
  ];

  return (
    <footer id="contact" className="bg-brand-primary text-white py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-800/30 to-blue-900/50"></div>
      <div className="container mx-auto px-6 relative">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center shadow-brand">
                <i className="fas fa-praying-hands text-brand-primary text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold font-poppins">Global Intercessors</h3>
            </div>
            <p className="text-blue-100 leading-relaxed mb-6 max-w-md">
              Uniting believers worldwide in continuous prayer, spiritual growth, and fellowship. Join our mission to cover the earth with prayer 24 hours a day.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-accent-dark transition-brand shadow-brand transform hover:scale-110"
                >
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 font-poppins">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-blue-200 hover:text-brand-accent transition-brand"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 font-poppins">Contact Info</h4>
            <div className="space-y-3">
              {contactInfo.map((contact, index) => (
                <div key={index} className="flex items-center">
                  <i className={`${contact.icon} text-brand-accent mr-3`}></i>
                  <span className="text-blue-200">{contact.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-blue-700/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-200 mb-4 md:mb-0">© 2025 Global Intercessors. All rights reserved.</p>
            <div className="flex space-x-6">
              {legalLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-blue-200 hover:text-brand-accent transition-brand"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
