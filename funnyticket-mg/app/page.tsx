import Link from "next/link";

const packs = [
  {
    name: "12 Heures",
    price: "1 000 Ar",
    duration: "12h",
    description: "Idéal pour une utilisation ponctuelle",
  },
  {
    name: "1 Semaine",
    price: "5 000 Ar",
    duration: "7 jours",
    description: "Parfait pour une semaine de connexion",
    popular: true,
  },
  {
    name: "1 Mois",
    price: "20 000 Ar",
    duration: "30 jours",
    description: "La meilleure offre pour un usage régulier",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-xl font-bold text-indigo-600">🎫 FunnyTicket</span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Vos tickets WiFi Starlink
          <span className="block text-indigo-600">en un clic</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Plus besoin de vous déplacer ! Achetez vos tickets WiFi en ligne,
          payez via mobile money, et recevez vos identifiants instantanément.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Commencer maintenant
          </Link>
          <a
            href="#packs"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voir les offres
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-12">
          Comment ça marche ?
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Choisissez votre pack",
              desc: "Sélectionnez la durée qui vous convient : 12h, 1 semaine ou 1 mois.",
            },
            {
              step: "2",
              title: "Payez via Mobile Money",
              desc: "Effectuez le paiement par Mvola, Orange Money ou Airtel Money et entrez la référence.",
            },
            {
              step: "3",
              title: "Connectez-vous",
              desc: "Recevez vos identifiants WiFi et connectez-vous au réseau Starlink.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-lg">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-800">
                {item.title}
              </h3>
              <p className="mt-2 text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packs */}
      <section id="packs" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-12">
          Nos offres
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.name}
              className={`relative rounded-2xl bg-white p-8 shadow-sm border ${
                pack.popular
                  ? "border-indigo-200 ring-2 ring-indigo-600"
                  : "border-gray-100"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                  Populaire
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-800">
                {pack.name}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{pack.description}</p>
              <p className="mt-4 text-3xl font-bold text-indigo-600">
                {pack.price}
              </p>
              <p className="text-sm text-gray-400">pour {pack.duration}</p>
              <Link
                href="/register"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                  pack.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Acheter
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <p>&copy; 2026 FunnyTicket. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
