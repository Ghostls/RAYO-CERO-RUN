import { Zap } from "lucide-react";

const Footer = () => (
  <footer className="glass border-t border-border/30 py-8 px-6">
    <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Rayo Cero Running</span>
        <span className="text-xs text-muted-foreground ml-2">by Valkyron Group</span>
      </div>
      <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Todos los derechos reservados.</p>
    </div>
  </footer>
);

export default Footer;
