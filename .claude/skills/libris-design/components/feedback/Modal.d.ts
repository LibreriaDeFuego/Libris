import React from 'react';
export interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}
