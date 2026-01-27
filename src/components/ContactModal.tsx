import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ContactForm, type ContactSource } from './ContactForm';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ContactSource;
}

export function ContactModal({ open, onOpenChange, source }: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get in touch</DialogTitle>
          <DialogDescription>
            Tell us about your team and we'll reach out to chat.
          </DialogDescription>
        </DialogHeader>
        <ContactForm
          source={source}
          onSuccess={() => {
            // Keep modal open to show success state
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
