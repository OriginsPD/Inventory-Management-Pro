import type { ReactNode } from 'react';

import { PortalPageShell } from '@/components/layout/PortalPageShell';

export interface PortalTab {
  id: string;
  label: string;
  icon: string;
}

interface PortalSectionShellProps {
  title: string;
  accentWord: string;
  subtitle: string;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export function PortalSectionShell(props: PortalSectionShellProps) {
  return (
    <PortalPageShell
      eyebrow="Console"
      title={props.title}
      accentWord={props.accentWord}
      subtitle={props.subtitle}
      tabs={props.tabs}
      activeTab={props.activeTab}
      onTabChange={props.onTabChange}
      variant="console"
      className={props.className}
    >
      {props.children}
    </PortalPageShell>
  );
}
