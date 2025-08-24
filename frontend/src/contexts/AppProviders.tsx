import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}