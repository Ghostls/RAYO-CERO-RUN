import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import RegistrationForm from "@/components/RegistrationForm";
import ResultsSection from "@/components/ResultsSection";
import Footer from "@/components/Footer";

const Index = () => {
  const scrollTo = (section: string) => {
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onNavigate={scrollTo} />
      <HeroSection onNavigate={scrollTo} />
      <RegistrationForm />
      <ResultsSection />
      <Footer />
    </div>
  );
};

export default Index;
