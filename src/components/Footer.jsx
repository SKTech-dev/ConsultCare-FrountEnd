import { useSelector } from "react-redux";

export default function Footer() {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <footer className="py-8 sm:py-12 border-t" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-2 text-center sm:text-left">
            <h3 className="text-lg font-bold mb-3" style={{ color: colors.secondary }}>
              CreateBot
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: colors.footerText }}>
              Intelligent chatbot solutions for modern businesses. Automate customer support, boost engagement, and grow your business with AI-powered conversations.
            </p>
            <div className="flex gap-3 justify-center sm:justify-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80" style={{ backgroundColor: colors.primary }}>
                <span className="text-white text-sm">f</span>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80" style={{ backgroundColor: colors.accent }}>
                <span className="text-white text-sm">t</span>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80" style={{ backgroundColor: colors.secondAccent }}>
                <span className="text-white text-sm">in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 text-sm" style={{ color: colors.secondary }}>
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Features</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Pricing</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Integrations</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>API</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="text-center sm:text-left">
            <h4 className="font-semibold mb-3 text-sm" style={{ color: colors.secondary }}>
              Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Help Center</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Contact Us</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Privacy Policy</a></li>
              <li><a href="#" className="hover:opacity-80" style={{ color: colors.footerText }}>Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-center sm:text-left" style={{ borderColor: colors.border }}>
          <p className="text-sm" style={{ color: colors.footerText }}>
            © 2024 CreateBot. All rights reserved.
          </p>
          <p className="text-sm" style={{ color: colors.footerText }}>
            Made with ❤️ for businesses worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}