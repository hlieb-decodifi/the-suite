import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import {
  Heart,
  Users,
  Star,
  Shield,
  Scissors,
  Calendar,
  MapPin,
  Award,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function AboutUsTemplate() {
  return (
    <div className="min-h-scree w-full bg-background">
      {/* Hero Section - Premium Brand Style */}
      <section className="relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Typography
              variant="p"
              className="mb-6 font-caslon text-3xl lg:text-4xl italic text-primary"
            >
              Elevating beauty experiences
            </Typography>

            <div className="mb-8 border-t border-border pt-4">
              <Typography
                variant="h1"
                className="font-futura text-5xl md:text-6xl font-bold text-foreground leading-tight mb-4"
              >
                About
              </Typography>
              <Typography
                variant="h1"
                className="font-futura text-5xl md:text-6xl font-bold text-foreground leading-tight"
              >
                The Suite
              </Typography>
            </div>

            <Typography className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Connecting exceptional beauty and wellness professionals with
              clients who value quality, convenience, and personalized care.
            </Typography>

            <div className="flex flex-col sm:flex-row mb-4 gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary px-10 py-6 font-futura text-xl font-bold text-white hover:bg-primary/90"
              >
                <Link className="font-futura" href="/services">
                  Discover Services
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="p"
                className="mb-4 font-caslon text-3xl italic text-primary"
              >
                Our purpose & ambition
              </Typography>
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
              >
                Mission & Vision
              </Typography>
              <Typography className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
                We're building the future of beauty and wellness services - one
                connection at a time.
              </Typography>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300">
                <CardContent className="p-8 lg:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary w-16 h-16 rounded-full flex items-center justify-center">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <Typography
                      variant="h3"
                      className="font-futura text-2xl lg:text-3xl font-bold text-foreground"
                    >
                      Our Mission
                    </Typography>
                  </div>
                  <Typography className="text-muted-foreground text-lg leading-relaxed">
                    To empower beauty and wellness professionals with the tools
                    and platform they need to build thriving businesses, while
                    providing clients with seamless access to exceptional,
                    personalized services in their area.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300">
                <CardContent className="p-8 lg:p-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary w-16 h-16 rounded-full flex items-center justify-center">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <Typography
                      variant="h3"
                      className="font-futura text-2xl lg:text-3xl font-bold text-foreground"
                    >
                      Our Vision
                    </Typography>
                  </div>
                  <Typography className="text-muted-foreground text-lg leading-relaxed">
                    To create a world where finding and booking premium beauty
                    and wellness services is effortless, where professionals can
                    focus on their craft, and where every client receives care
                    that exceeds their expectations.
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="p"
                className="mb-4 font-caslon text-3xl italic text-primary"
              >
                The principles that guide us
              </Typography>
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground"
              >
                Our Core Values
              </Typography>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-8 lg:p-12">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Heart className="h-10 w-10 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                  >
                    Quality First
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    We partner only with verified, skilled professionals who
                    share our commitment to excellence and client satisfaction.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="text-center bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-8 lg:p-12">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Shield className="h-10 w-10 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                  >
                    Trust & Safety
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Your security is our priority. From verified professionals
                    to secure payments, we ensure every interaction is safe and
                    reliable.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="text-center bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-8 lg:p-12">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Users className="h-10 w-10 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                  >
                    Community Focus
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    We're building more than a platform - we're creating a
                    community where professionals and clients thrive together.
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="p"
                className="mb-4 font-caslon text-3xl italic text-primary"
              >
                Simple, seamless, sophisticated
              </Typography>
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground"
              >
                How The Suite Works
              </Typography>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-card">
                    <MapPin className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="font-futura text-lg font-bold text-primary">
                      1
                    </span>
                  </div>
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                >
                  Discover Local Professionals
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  Browse verified beauty and wellness professionals in your
                  area, complete with ratings, portfolios, and detailed service
                  offerings.
                </Typography>
              </div>

              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-card">
                    <Calendar className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="font-futura text-lg font-bold text-primary">
                      2
                    </span>
                  </div>
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                >
                  Book Instantly
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  Select your preferred date and time, choose your services, and
                  book instantly with our seamless scheduling system.
                </Typography>
              </div>

              <div className="text-center group">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-card">
                    <Scissors className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="font-futura text-lg font-bold text-primary">
                      3
                    </span>
                  </div>
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl lg:text-2xl font-bold text-foreground mb-4"
                >
                  Enjoy Your Experience
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  Relax and enjoy exceptional service from skilled
                  professionals. Rate your experience to help our community grow
                  stronger.
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section - Premium Gold Background */}
      <section className="py-20 lg:py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="p"
                className="mb-4 font-caslon text-3xl italic text-primary-foreground/90"
              >
                Growing stronger every day
              </Typography>
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground"
              >
                The Suite by Numbers
              </Typography>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <Typography
                  variant="h2"
                  className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2"
                >
                  500+
                </Typography>
                <Typography className="text-primary-foreground/90 font-medium">
                  Verified Professionals
                </Typography>
              </div>

              <div className="text-center">
                <Typography
                  variant="h2"
                  className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2"
                >
                  10K+
                </Typography>
                <Typography className="text-primary-foreground/90 font-medium">
                  Happy Clients
                </Typography>
              </div>

              <div className="text-center">
                <Typography
                  variant="h2"
                  className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2"
                >
                  25K+
                </Typography>
                <Typography className="text-primary-foreground/90 font-medium">
                  Bookings Completed
                </Typography>
              </div>

              <div className="text-center">
                <Typography
                  variant="h2"
                  className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2"
                >
                  4.9
                </Typography>
                <Typography className="text-primary-foreground/90 font-medium">
                  Average Rating
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="p"
                className="mb-4 font-caslon text-3xl italic text-primary"
              >
                More than just a booking platform
              </Typography>
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground"
              >
                Why Choose The Suite?
              </Typography>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Star className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Verified Excellence
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Every professional is vetted, licensed, and committed to
                    maintaining the highest standards of service.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Calendar className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Flexible Scheduling
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Book appointments that fit your schedule with real-time
                    availability and easy rescheduling options.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Shield className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Secure Payments
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Protected transactions, transparent pricing, and hassle-free
                    payment processing for peace of mind.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <MapPin className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Local Focus
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Find exceptional professionals in your neighborhood and
                    support your local beauty community.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Award className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Quality Guarantee
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Not satisfied? We work with you and our professionals to
                    ensure every experience meets our high standards.
                  </Typography>
                </CardContent>
              </Card>

              <Card className="bg-background border-0 shadow-card hover:shadow-dropdown transition-all duration-300 group">
                <CardContent className="p-6 lg:p-8">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <Users className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Typography
                    variant="h4"
                    className="font-futura text-lg lg:text-xl font-bold text-foreground mb-3"
                  >
                    Community Support
                  </Typography>
                  <Typography className="text-muted-foreground leading-relaxed">
                    Join a growing community of beauty enthusiasts and
                    professionals who share your passion for excellence.
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
