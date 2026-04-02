import { Wrench, Laptop, Smartphone, ShoppingCart, Calendar, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation Simple */}
      <nav className="flex items-center justify-between px-8 py-6 bg-primary text-white sticky top-0 z-50">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wrench className="w-8 h-8 text-accent" />
          <span>ELECTRO&apos;FIX</span>
        </div>
        <div className="flex gap-6 items-center">
          <a href="#services" className="hover:text-accent transition-colors">Services</a>
          <a href="#boutique" className="hover:text-accent transition-colors">Boutique</a>
          <button className="bg-accent hover:bg-orange-600 text-white px-6 py-2 rounded-full font-semibold transition-all">
            Prendre RDV
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-primary text-white py-24 px-8 overflow-hidden">
        <div className="max-w-4xl relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in">
            Donnez une seconde vie à vos appareils.
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl leading-relaxed">
            Experts en dépannage électroménager, informatique et téléphonie à domicile ou en atelier.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Réserver une réparation
            </button>
            <button className="bg-transparent border-2 border-white/30 hover:border-white text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Visiter la boutique
            </button>
          </div>
        </div>
        {/* Décoration de fond */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-10 rotate-12 hidden lg:block">
          <Wrench size={500} />
        </div>
      </header>

      {/* Bandeau Partenaires/Labels */}
      <section className="py-12 bg-slate-50 border-y border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          <img src="/logos/label-quali.png" alt="Label Quali Répar" className="h-16 w-auto object-contain" />
          <img src="/logos/pro-co.jpg" alt="Pro & Co" className="h-12 w-auto object-contain" />
          <img src="/logos/pro-infor.png" alt="Pro & Infor" className="h-14 w-auto object-contain" />
          <img src="/logos/save-white-blue.png" alt="Save" className="h-10 w-auto object-contain" />
        </div>
      </section>

      {/* Features - Les 3 piliers */}
      <section id="services" className="py-24 px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <Wrench className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Électroménager</h3>
            <p className="text-slate-600 leading-relaxed">
              Lave-linge, fours, frigos... Nous intervenons rapidement chez vous avec des pièces d&apos;origine.
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <Laptop className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Informatique</h3>
            <p className="text-slate-600 leading-relaxed">
              Réparation PC/Mac, suppression de virus, récupération de données et installation réseaux.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-50 hover:shadow-xl transition-all border border-slate-100 group">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Téléphonie</h3>
            <p className="text-slate-600 leading-relaxed">
              Écrans cassés, batteries fatiguées, déblocages. Réparation express en atelier.
            </p>
          </div>
        </div>
      </section>

      {/* Proximité géographique */}
      <section className="bg-slate-900 text-white py-20 px-8 rounded-3xl mx-8 mb-24 overflow-hidden relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-accent font-bold mb-4 uppercase tracking-widest text-sm">
            <MapPin className="w-4 h-4" />
            Service de Proximité
          </div>
          <h2 className="text-4xl font-bold mb-6">Optimisé pour votre secteur</h2>
          <p className="text-xl text-slate-300 mb-8">
            Notre système de planning intelligent suggère des créneaux en fonction de la position de nos techniciens pour réduire votre attente et notre empreinte carbone.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-8 border-t border-slate-100 text-center text-slate-500">
        <div className="flex items-center justify-center gap-2 font-bold text-primary mb-4">
          <Wrench className="w-6 h-6 text-accent" />
          ELECTRO&apos;FIX
        </div>
        <p>© 2026 ELECTRO&apos;FIX. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
