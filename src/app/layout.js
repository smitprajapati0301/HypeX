import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "HypeX | AI Cricket Fan Engagement Platform",
  description: "Experience cricket like never before. Get live scores, trigger highlight hype commentaries, memes, and reel captions with Google Gemini Pro.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {/* Unified sticky navigation banner */}
        <Navbar />
        
        {/* Dynamic page mount context */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
