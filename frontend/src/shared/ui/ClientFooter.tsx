import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Mail, Shield, Truck, Sparkles } from 'lucide-react';
import { Logo } from './Logo';

const linkClass =
  'text-sm text-paper-200 hover:text-brand-yellow-300 font-medium transition-colors duration-150';

export const ClientFooter = () => {
  return (
    <footer className="bg-ink-900 text-paper-0 mt-auto">
      {/* Borde decorativo amarillo en top */}
      <div className="h-1 bg-gradient-to-r from-brand-red-500 via-brand-yellow-400 to-brand-red-500" />

      {/* Banner de promesa */}
      <div className="border-b border-ink-800">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureItem
            icon={<Truck size={18} />}
            title="Envío veloz"
            sub="20–35 min en CABA"
          />
          <FeatureItem
            icon={<Shield size={18} />}
            title="Ingredientes premium"
            sub="Filtros por alérgeno"
          />
          <FeatureItem
            icon={<Sparkles size={18} />}
            title="Recetas auténticas"
            sub="Chef del año 2025"
          />
        </div>
      </div>

      {/* Cuerpo del footer */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Logo size="md" variant="yellow" />
            <div>
              <span className="font-display font-black text-lg leading-tight block">Food Store</span>
              <span className="block text-[10px] text-brand-yellow-300 font-black uppercase tracking-[0.2em]">
                Sabores · Pasión · Calidad
              </span>
            </div>
          </div>
          <p className="text-sm text-paper-300 leading-relaxed">
            Cocinamos a fuego lento con ingredientes seleccionados. Cada plato cuenta una historia
            y respeta tus preferencias alimentarias.
          </p>
        </div>

        {/* Navegación */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-yellow-400 mb-4">
            Tienda
          </h4>
          <ul className="space-y-2.5">
            <li><Link to="/" className={linkClass}>Nuestro menú</Link></li>
            <li><Link to="/pedidos" className={linkClass}>Mis pedidos</Link></li>
            <li><Link to="/direcciones" className={linkClass}>Mis direcciones</Link></li>
            <li><Link to="/checkout" className={linkClass}>Finalizar compra</Link></li>
          </ul>
        </div>

        {/* Soporte */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-yellow-400 mb-4">
            Soporte
          </h4>
          <ul className="space-y-2.5">
            <li><span className={linkClass}>Centro de ayuda</span></li>
            <li><span className={linkClass}>Política de envíos</span></li>
            <li><span className={linkClass}>Términos &amp; condiciones</span></li>
            <li><span className={linkClass}>Privacidad</span></li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-yellow-400 mb-4">
            Visitanos
          </h4>
          <ul className="space-y-3 text-sm text-paper-200">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="text-brand-yellow-400 shrink-0 mt-0.5" />
              <span>Av. Rivadavia 1420, Balvanera, CABA</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock size={16} className="text-brand-yellow-400 shrink-0 mt-0.5" />
              <span>Lun – Dom · 11:00 – 23:30</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={16} className="text-brand-yellow-400 shrink-0 mt-0.5" />
              <span>+54 11 4000-1234</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail size={16} className="text-brand-yellow-400 shrink-0 mt-0.5" />
              <span>hola@foodstore.com.ar</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sello inferior */}
      <div className="border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-paper-300">
          <span className="font-medium">© {new Date().getFullYear()} Food Store · Hecho con pasión culinaria.</span>
          <span className="font-bold uppercase tracking-wider text-[10px] text-brand-yellow-400">
            UTN · SDD · Parcial 2026
          </span>
        </div>
      </div>
    </footer>
  );
};

const FeatureItem = ({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-brand-red-500/20 text-brand-yellow-300 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <span className="block text-sm font-black text-paper-0 truncate">{title}</span>
      <span className="block text-[11px] text-paper-300 font-medium truncate">{sub}</span>
    </div>
  </div>
);
