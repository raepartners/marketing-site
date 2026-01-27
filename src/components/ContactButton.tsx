import * as React from 'react';
import { cn } from '@/lib/utils';
import { ContactModal } from './ContactModal';
import type { ContactSource } from './ContactForm';

interface ContactButtonProps {
  source: ContactSource;
  className?: string;
  variant?: 'primary' | 'link';
  children?: React.ReactNode;
}

export function ContactButton({
  source,
  className,
  variant = 'primary',
  children = 'Contact',
}: ContactButtonProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      // Navigate to contact page on mobile
      window.location.href = '/contact';
    } else {
      // Open modal on desktop
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const baseStyles = variant === 'primary'
    ? 'text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
    : 'hover:text-foreground transition-colors';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(baseStyles, className)}
      >
        {children}
      </button>
      <ContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        source={source}
      />
    </>
  );
}
