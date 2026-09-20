import { useSelector } from "react-redux";


export default function Landing() {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <section className="w-full py-6 sm:py-10 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8 lg:gap-16">

      {/* LEFT CONTENT */}
      <div className="w-full lg:max-w-xl">
        <div className="font-semibold tracking-wide uppercase text-xs sm:text-sm" style={{ color: colors.primary }}>
          The Smartest Social Chatbot for Business Growth
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mt-3 sm:mt-4" style={{ color: colors.secondary }}>
          Talk, engage <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>and grow your <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>business with AI
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base leading-relaxed" style={{ color: colors.textMuted }}>
          Create your own intelligent chatbot in minutes. Just enter your company WhatsApp number, configure your data, and let
          the AI handle customer questions, orders, and support — automatically and 24/7.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button 
            onClick={() => window.location.href = '/setup'}
            className="w-full sm:w-auto transition text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-md hover:opacity-90 text-sm sm:text-base" 
            style={{ backgroundColor: colors.accent }}
          >
            Set Up Your Company
          </button>
          <button className="w-full sm:w-auto transition text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-md hover:opacity-90 text-sm sm:text-base" style={{ backgroundColor: colors.secondAccent }}>
            Play Demo
          </button>
        </div>
      </div>

      {/* RIGHT IMAGE AREA - Hidden on mobile */}
      <div className="hidden lg:flex justify-center relative lg:flex-1">
        <div className="relative">
          <img
            src="/src/assets/girl.png"
            alt="Woman working with laptop"
            className="w-[350px] xl:w-[400px] object-contain relative z-10"
          />
          
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
            <div className="w-[300px] xl:w-[400px] h-[300px] xl:h-[400px] rounded-full opacity-40 blur-sm" style={{ background: `linear-gradient(to bottom right, ${colors.gradientStart}, ${colors.gradientMid}, ${colors.gradientEnd})` }}></div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute top-8 right-8 w-3 xl:w-4 h-3 xl:h-4 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }}></div>
          <div className="absolute bottom-12 left-8 w-2 xl:w-3 h-2 xl:h-3 rounded-full animate-bounce" style={{ backgroundColor: colors.accent }}></div>
        </div>
      </div>

      </div>
    </section>
  );
}
