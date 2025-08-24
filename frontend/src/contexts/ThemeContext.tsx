import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as Font from 'expo-font';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    cardBackground: string;
    text: string;
    textSecondary: string;
    error: string;
    borderColor: string;
    upvote: string;
    downvote: string;
    accent: string;
    icon: string;
    pillBackground: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontFamily: {
    regular: string;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#FF4500', 
    secondary: '#1E88E5', 
    background: '#F5F5F5',
    cardBackground: '#FFFFFF',
    text: '#1A1A1B',
    textSecondary: '#787C7E',
    error: '#FF3B30',
    borderColor: '#EDEFF1',
    upvote: '#FF4500',
    downvote: '#7193FF',
    accent: '#0079D3',
    icon: '#1A1A1B',
    pillBackground: '#F0F2F5', 
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontFamily: {
    regular: 'PatrickHand',
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#FF4500', 
    secondary: '#4FBCFF', 
    background: '#1A1A1B',
    cardBackground: '#272729',
    text: '#D7DADC',
    textSecondary: '#818384',
    error: '#FF4D4F',
    borderColor: '#343536',
    upvote: '#FF4500',
    downvote: '#7193FF',
    accent: '#24A0ED',
    icon: '#D7DADC',
    pillBackground: '#373737', 
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontFamily: {
    regular: 'PatrickHand',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  fontsLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  const [fontsLoaded, setFontsLoaded] = useState(false);

  
  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'PatrickHand': require('../../assets/fonts/PatrickHand-Regular.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, fontsLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}