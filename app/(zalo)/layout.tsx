import React from 'react';
import LayoutBase from '../ui/layout/layout';

export default function ZaloLayout({ children }: { children: React.ReactNode }) {
  return <LayoutBase>{children}</LayoutBase>;
}
