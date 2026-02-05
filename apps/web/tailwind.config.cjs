const assistantUiPlugin =
  require("@assistant-ui/react-ui/tailwindcss").default;

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        clay: "#f5efe6",
        haze: "#f8f7f4",
        tide: "#0f766e",
        mist: "#e7e5e4"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: [assistantUiPlugin({ components: ["thread"] }), require("tailwindcss-animate")]
};
