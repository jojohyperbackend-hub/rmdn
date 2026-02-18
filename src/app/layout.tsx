import "@/styles/globals.css";

export const metadata = {
  title: "RMDN - Ramadan Tracker",
  description: "Simple Ramadan Tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen font-sans">
        <main className="p-4 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
