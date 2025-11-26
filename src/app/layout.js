
import "./globals.css";
import { BibleProvider } from "../context/BibleContext";

export const metadata = {
  title: "Biblia App",
  description: "Leitor da Bíblia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>
        <BibleProvider>
          {children}
        </BibleProvider>
      </body>
    </html>
  );
}
