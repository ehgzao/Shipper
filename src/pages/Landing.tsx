import { Button } from "@/components/ui/button";
import { Ship, Target, BarChart3, Sparkles, Check, ArrowRight, Users, Globe, Crosshair } from "lucide-react";
import { Link } from "react-router-dom";
import featureTargetListReal from "@/assets/feature-target-list-real.png";
import featureMatchAiReal from "@/assets/feature-match-ai-real.png";
const Landing = () => {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container-wide">
          <nav className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <Ship className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Shipper</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Button asChild size="sm">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container-narrow text-center">
          <div className="flex justify-center mb-6">
            <Ship className="h-16 w-16 text-primary animate-float" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-up">Shipping opportunities for Product People</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-up delay-100">Ship opportunities for Product People</p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up delay-200">The job tracker built for Product People who believe in quality over quantity.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
            <Button asChild size="xl" variant="hero">
              <Link to="/signup">Get Started - Free</Link>
            </Button>
            <Button asChild size="xl" variant="hero-outline">
              <a href="#how-it-works">See How It Works <ArrowRight className="ml-2 h-5 w-5" /></a>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-muted/30">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Job hunting is broken
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Traditional approaches leave you exhausted and overlooked.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[{
            icon: Target,
            title: "Spray & Pray",
            desc: "Applying to 100+ jobs and hearing back from none. Quantity doesn't equal quality."
          }, {
            icon: BarChart3,
            title: "Lost in Chaos",
            desc: "Spreadsheets, notes, emails everywhere. No clear pipeline or progress tracking."
          }, {
            icon: Sparkles,
            title: "AI Spam",
            desc: "100% AI-written applications get filtered by AI. You become noise, not signal."
          }].map((item, i) => <div key={i} className="bg-card rounded-xl p-6 shadow-sm border border-border/50 animate-fade-up" style={{
            animationDelay: `${i * 100}ms`
          }}>
                <item.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Solution / Features */}
      <section id="features" className="py-20">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            A different approach
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Fewer applications. Better applications. Real results.
          </p>
          <div className="space-y-24">
            {/* Feature 1: Target List + Pipeline */}
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-8">
                <div className="animate-fade-up">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <Target className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-2xl mb-3">Curated Target List</h3>
                  <p className="text-muted-foreground">Build your dream list, not a spray list. Start with 60 pre-selected companies across 6 countries (Portugal, Brazil, Germany, Spain, Ireland, Netherlands) or add your own.</p>
                </div>
                <div className="animate-fade-up" style={{
                animationDelay: '100ms'
              }}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-2xl mb-3">Smart Pipeline</h3>
                  <p className="text-muted-foreground">Track with intention, not anxiety. A clean Kanban board to track your applications from research to offer.</p>
                </div>
              </div>
              <div className="flex-1 lg:flex-[1.2]">
                <div className="rounded-xl overflow-hidden shadow-2xl border border-border/50">
                  <img src={featureTargetListReal} alt="Target List and Pipeline features" className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>

            {/* Feature 2: Match Score + AI Coach */}
            <div className="flex flex-col lg:flex-row-reverse gap-12 items-center">
              <div className="flex-1 space-y-8">
                <div className="animate-fade-up">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <Crosshair className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-2xl mb-3">Match Scoring</h3>
                  <p className="text-muted-foreground">Know your fit before you apply. Our matching system analyzes your profile against each role—skills, seniority, experience.</p>
                </div>
                <div className="animate-fade-up" style={{
                animationDelay: '100ms'
              }}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-2xl mb-3">AI Coach</h3>
                  <p className="text-muted-foreground">Suggestions, not substitutions. Get personalized tips for each application. You stay authentic.</p>
                </div>
              </div>
              <div className="flex-1 lg:flex-[1.2]">
                <div className="rounded-xl overflow-hidden shadow-2xl border border-border/50">
                  <img src={featureMatchAiReal} alt="Match Scoring and AI Coach features" className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Get started in 3 minutes
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Simple setup, powerful tracking.
          </p>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-border" />
            {[{
            step: "1",
            title: "Profile",
            desc: "Tell us about your background and target roles"
          }, {
            step: "2",
            title: "Build List",
            desc: "Pick from 60+ curated companies or add your own"
          }, {
            step: "3",
            title: "Start Tracking",
            desc: "Add opportunities, track progress, get AI coaching"
          }].map((item, i) => <div key={i} className="text-center animate-fade-up" style={{
            animationDelay: `${i * 150}ms`
          }}>
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4 relative z-10">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* For Who */}
      <section className="py-20">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Built for PMs like you
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Whether you're switching careers or leveling up.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[{
            icon: Users,
            title: "Career Switchers",
            desc: "8 years in sales or engineering? Transitioning to PM? We help position your experience."
          }, {
            icon: Globe,
            title: "International Job Seekers",
            desc: "Looking for PM roles in Europe or remote? We've pre-mapped companies across 6 countries."
          }, {
            icon: Crosshair,
            title: "Intentional Applicants",
            desc: "Tired of mass-applying? Quality over quantity is your philosophy too."
          }].map((item, i) => <div key={i} className="bg-card rounded-xl p-6 shadow-sm border border-border/50 animate-fade-up" style={{
            animationDelay: `${i * 100}ms`
          }}>
                <item.icon className="h-10 w-10 text-secondary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container-narrow">
          <div className="max-w-md mx-auto bg-card rounded-2xl p-8 shadow-lg border border-border/50 text-center animate-scale-in">
            <h2 className="text-3xl font-bold mb-2">Free. Forever.</h2>
            <p className="text-muted-foreground mb-6">
              No credit card. No trial period. No catch. Just start tracking.
            </p>
            <ul className="text-left space-y-3 mb-8">
              {["Unlimited opportunities", "60 pre-curated companies", "AI coaching (10/day)", "Match scoring", "Progress tracking"].map((item, i) => <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-5 w-5 text-success" />
                  {item}
                </li>)}
            </ul>
            <Button asChild size="lg" className="w-full">
              <Link to="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary">
        <div className="container-narrow text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to ship your next opportunity?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Stop spraying. Start shipping.
          </p>
          <Button asChild size="xl" variant="secondary">
            <Link to="/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container-narrow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              <span className="font-semibold">Shipper</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for PMs, by a PM.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2025 Shipper. Made with ☕ in Porto.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;