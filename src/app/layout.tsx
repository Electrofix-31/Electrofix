import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase";
import SupabaseListener from "@/components/supabase-listener"; // Nous allons créer ce fichier ensuite
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ELECTRO'FIX - Votre partenaire dépannage",
  description: "Dépannage électroménager, informatique et téléphonie. Vente de matériel.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseListener accessToken={session?.access_token} serverSession={session} />
        {children}
      </body>
    </html>
  );
}
