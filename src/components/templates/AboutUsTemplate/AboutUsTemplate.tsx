import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function AboutUsTemplate() {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Hero Section */}
      <section className="py-4 lg:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Typography
              variant="h1"
              className="font-futura text-5xl md:text-6xl font-bold text-foreground leading-tight mb-8"
            >
              About <span className="underline">The Suite</span>
            </Typography>

            <Typography className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              At The Suite, we believe access to haircare isn't just about
              convenience—
              <strong className="text-foreground">
                {' '}
                it's about dignity, identity, and reclaiming your time.
              </strong>
            </Typography>

            <div className="bg-muted/30 rounded-lg p-8 lg:p-12 mb-12">
              <Typography className="text-lg lg:text-xl text-foreground leading-relaxed">
                In too many places, especially outside major cities, individuals
                with curly, coily, or kinky hair are forced to travel hours just
                to find a professional who understands their texture.
                <br />
                <span className="text-primary font-semibold">
                  {' '}
                  These haircare deserts don't just disrupt routines — they
                  steal time, create stress, and make basic grooming feel like a
                  luxury.
                </span>
              </Typography>
            </div>

            <Typography className="text-2xl text-foreground font-bold mb-8 text-primary">
              We created The Suite to change that story.
            </Typography>

            <Typography className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              By organizing on-site haircare events at schools and workplaces,
              we bring trusted stylists and barbers directly to the communities
              that need them most. The result is simple: less travel, more
              access, and a reliable way for people to care for their hair —
              where they already are.
            </Typography>

            <div className="bg-primary/10 rounded-lg p-8 lg:p-12 mb-12">
              <Typography className="text-lg lg:text-xl text-foreground leading-relaxed font-medium">
                Our work is about more than just hair. It's about meeting
                everyday needs in overlooked places{' '}
                <span className="text-primary font-bold">
                  {' '}
                  — because no one should have to travel 100 miles just to get
                  their hair done.
                </span>
              </Typography>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary px-10 py-6 font-futura text-xl font-bold text-white hover:bg-primary/90 transition-all duration-300"
              >
                <Link href="/services">
                  Discover Our Services
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      {/* <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl font-bold text-foreground mb-6"
              >
                How We Make It Happen
              </Typography>
              <Typography className="text-lg text-muted-foreground">
                Transforming haircare deserts into thriving communities, one
                event at a time
              </Typography>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-10 w-10 text-white" />
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl font-bold text-foreground mb-4"
                >
                  Scout & Connect
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  We identify underserved communities and partner with local
                  schools and workplaces ready to host transformative haircare
                  events
                </Typography>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-10 w-10 text-white" />
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl font-bold text-foreground mb-4"
                >
                  Curate & Coordinate
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  We bring together skilled stylists who specialize in textured
                  hair and orchestrate seamless on-site events that fit your
                  schedule
                </Typography>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scissors className="h-10 w-10 text-white" />
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl font-bold text-foreground mb-4"
                >
                  Transform & Empower
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  You get premium haircare that celebrates your natural texture—
                  right where you work, learn, and live
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Values Section */}
      {/* <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Typography
                variant="h2"
                className="font-futura text-4xl md:text-5xl font-bold text-foreground mb-6"
              >
                Our Mission in Action
              </Typography>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl font-bold text-foreground mb-4"
                >
                  Breaking Down Barriers
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  We're dismantling the geographic and economic barriers that
                  keep quality haircare out of reach, making professional
                  services accessible to every community
                </Typography>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <Typography
                  variant="h4"
                  className="font-futura text-xl font-bold text-foreground mb-4"
                >
                  Empowering Communities
                </Typography>
                <Typography className="text-muted-foreground leading-relaxed">
                  We bring services directly to the heart of communities,
                  turning overlooked places into centers of care and connection
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </section> */}
    </div>
  );
}
