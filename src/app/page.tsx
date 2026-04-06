import { Wrench, Laptop, Smartphone, ShoppingCart, Calendar, MapPin, User, Menu } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      {/* Navigation Responsive */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 bg-primary text-white sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight z-10">
          <Wrench className="w-6 h-6 md:w-8 md:h-8 text-accent shrink-0" />
          <span className="truncate">ELECTRO&apos;FIX</span>
        </div>
        
        {/* Menu Desktop */}
        <div className="hidden md:flex gap-6 items-center">
          <a href="#services" className="hover:text-accent transition-colors">Services</a>
          <a href="#boutique" className="hover:text-accent transition-colors">Boutique</a>
          <Link href="/login" className="flex items-center gap-2 hover:text-accent transition-colors font-semibold">
            <User className="w-5 h-5" />
            Mon compte
          </Link>
          <Link href="/book" className="bg-accent hover:bg-orange-600 text-white px-6 py-2 rounded-full font-semibold transition-all shadow-lg hover:shadow-orange-500/30">
            Prendre RDV
          </Link>
        </div>

        {/* Menu Mobile (Actions rapides) */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/login" className="p-2 hover:text-accent transition-colors" aria-label="Mon compte">
            <User className="w-6 h-6" />
          </Link>
          <Link href="/book" className="bg-accent text-white px-4 py-2 text-sm rounded-full font-bold shadow-md">
            RDV
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-primary text-white py-16 md:py-24 px-4 md:px-8 overflow-hidden">
        <div className="max-w-4xl relative z-10 mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-4 md:mb-6 animate-fade-in leading-tight">
            Donnez une seconde vie à vos appareils.
          </h1>
          <p className="text-lg md:text-2xl text-blue-100 mb-8 md:mb-10 max-w-2xl leading-relaxed">
            Experts en dépannage électroménager, informatique et téléphonie à domicile ou en atelier.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/book" className="bg-white text-primary px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-xl w-full sm:w-auto">
              <Calendar className="w-5 h-5 shrink-0" />
              Réserver une réparation
            </Link>
            <button className="bg-transparent border-2 border-white/30 hover:border-white text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
              <ShoppingCart className="w-5 h-5 shrink-0" />
              Visiter la boutique
            </button>
          </div>
        </div>
        {/* Décoration de fond */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-10 rotate-12 hidden lg:block pointer-events-none">
          <Wrench size={500} />
        </div>
      </header>

      {/* Bandeau Partenaires/Labels */}
      <section className="py-8 md:py-12 bg-slate-50 border-y border-slate-100 overflow-hidden px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center items-center gap-6 md:gap-12 lg:gap-20 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <img src="/logos/label-quali.png" alt="Label Quali Répar" className="h-10 md:h-16 w-auto object-contain" />
          <img src="/logos/pro-co.jpg" alt="Pro & Co" className="h-8 md:h-12 w-auto object-contain" />
          <img src="/logos/pro-infor.png" alt="Pro & Infor" className="h-10 md:h-14 w-auto object-contain" />
          <img src="/logos/save-white-blue.png" alt="Save" className="h-8 md:h-10 w-auto object-contain" />
        </div>
      </section>

      {/* Features - Les 3 piliers */}
      <section id="services" className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
          <div className="p-6 md:p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 text-primary group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Électroménager</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Lave-linge, fours, frigos... Nous intervenons rapidement chez vous avec des pièces d&apos;origine.
            </p>
          </div>
          
          <div className="p-6 md:p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 text-primary group-hover:scale-110 transition-transform">
              <Laptop className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Informatique</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Réparation PC/Mac, suppression de virus, récupération de données et installation réseaux.
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group sm:col-span-2 md:col-span-1">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 text-primary group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Téléphonie</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Écrans cassés, batteries fatiguées, déblocages. Réparation express en atelier.
            </p>
          </div>
        </div>
      </section>

      {/* Proximité géographique */}
      <section className="bg-slate-900 text-white py-12 md:py-20 px-6 md:px-8 rounded-2xl md:rounded-3xl mx-4 md:mx-8 mb-16 md:mb-24 overflow-hidden relative">
        <div className="max-w-3xl relative z-10">
          <div className="flex items-center gap-2 text-accent font-bold mb-3 md:mb-4 uppercase tracking-widest text-xs md:text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            Service de Proximité
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Optimisé pour votre secteur</h2>
          <p className="text-lg md:text-xl text-slate-300 mb-6 md:mb-8 text-pretty">
            Notre système de planning intelligent suggère des créneaux en fonction de la position de nos techniciens pour réduire votre attente et notre empreinte carbone.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 md:py-12 px-4 md:px-8 border-t border-slate-100 text-center text-slate-500">
        <div className="flex items-center justify-center gap-2 font-bold text-primary mb-4">
          <Wrench className="w-5 h-5 text-accent" />
          ELECTRO&apos;FIX
        </div>
        <p className="text-sm md:text-base">© 2026 ELECTRO&apos;FIX. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
