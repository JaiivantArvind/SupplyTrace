import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogoCloud } from '@/components/ui/logo-cloud';
import { Link } from 'react-router-dom';
import { LinkIcon, ArrowRightIcon, SearchIcon } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      {/* radial top glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 isolate hidden overflow-hidden contain-strict lg:block"
      >
        <div className="absolute inset-0 -top-14 isolate -z-10 bg-[radial-gradient(35%_80%_at_49%_0%,hsl(var(--foreground)/.08),transparent)] contain-strict" />
      </div>

      {/* outer border lines */}
      <div
        aria-hidden="true"
        className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-5xl lg:block"
      >
        <div className="absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15 [mask-image:linear-gradient(to_bottom,transparent_80%,black_100%)]" />
        <div className="absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15 [mask-image:linear-gradient(to_bottom,transparent_80%,black_100%)]" />
      </div>

      {/* main content */}
      <div className="relative flex flex-col items-center justify-center gap-5 pt-32 pb-28">
        {/* inner border lines */}
        <div aria-hidden="true" className="absolute inset-0 -z-[1] size-full overflow-hidden">
          <div className="absolute inset-y-0 left-4 w-px bg-gradient-to-b from-transparent via-border to-border md:left-8" />
          <div className="absolute inset-y-0 right-4 w-px bg-gradient-to-b from-transparent via-border to-border md:right-8" />
          <div className="absolute inset-y-0 left-8 w-px bg-gradient-to-b from-transparent via-border/50 to-border/50 md:left-12" />
          <div className="absolute inset-y-0 right-8 w-px bg-gradient-to-b from-transparent via-border/50 to-border/50 md:right-12" />
        </div>

        {/* badge */}
        <div
          className={cn(
            'group mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-3 py-1 shadow',
            'animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-500 ease-out',
          )}
        >
          <LinkIcon className="size-3 text-muted-foreground" />
          <span className="text-xs">Now live on Ethereum Sepolia</span>
          <span className="block h-5 border-l" />
          <ArrowRightIcon className="size-3 duration-150 ease-out group-hover:translate-x-1 transition-transform" />
        </div>

        {/* headline */}
        <h1
          className={cn(
            'animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-balance text-center text-4xl font-bold tracking-tight delay-100 duration-500 ease-out md:text-5xl lg:text-6xl',
          )}
        >
          Tamper-Proof <br className="hidden sm:block" />
          Supply Chain Provenance
        </h1>

        {/* sub */}
        <p className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards mx-auto max-w-lg text-center text-base text-muted-foreground tracking-wide delay-200 duration-500 ease-out sm:text-lg">
          Tokenise product batches on Ethereum, enforce custody by role, and let{' '}
          <span className="text-foreground font-medium">anyone</span> verify authenticity — no intermediaries, no trust required.
        </p>

        {/* CTAs */}
        <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards flex flex-row flex-wrap items-center justify-center gap-3 pt-2 delay-300 duration-500 ease-out">
          <Button asChild variant="secondary" className="rounded-full" size="lg">
            <Link to="/explore">
              <SearchIcon className="size-4 mr-2" />
              Explore Batches
            </Link>
          </Button>
          <Button asChild className="rounded-full" size="lg">
            <Link to="/mint">
              Launch App
              <ArrowRightIcon className="size-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function TechStackSection() {
  return (
    <section className="relative space-y-4 border-t pt-6 pb-10">
      <h2 className="text-center font-medium text-lg text-muted-foreground tracking-tight md:text-xl">
        Built on <span className="text-foreground">battle-tested</span> open standards
      </h2>
      <div className="relative z-10 mx-auto max-w-4xl">
        <LogoCloud logos={techLogos} />
      </div>
    </section>
  );
}

const techLogos = [
  { src: 'https://cdn.simpleicons.org/ethereum', alt: 'Ethereum' },
  { src: 'https://cdn.simpleicons.org/solidity', alt: 'Solidity' },
  { src: 'https://cdn.simpleicons.org/openzeppelin', alt: 'OpenZeppelin' },
  { src: 'https://cdn.simpleicons.org/ipfs', alt: 'IPFS' },
  { src: 'https://cdn.simpleicons.org/thegraph', alt: 'The Graph' },
  { src: 'https://cdn.simpleicons.org/gnosis', alt: 'Gnosis Safe' },
  { src: 'https://cdn.simpleicons.org/react', alt: 'React' },
  { src: 'https://cdn.simpleicons.org/typescript', alt: 'TypeScript' },
  { src: 'https://cdn.simpleicons.org/vite', alt: 'Vite' },
  { src: 'https://cdn.simpleicons.org/hardhat', alt: 'Hardhat' },
];
