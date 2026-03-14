import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";

export const metadata = {
  title: "CoinDCX Trading Platform",
  description: "Operational dashboard for the CoinDCX trading bot",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
