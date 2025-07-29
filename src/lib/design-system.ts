// Design System - Konzistentni stilovi za cijelu aplikaciju

export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main orange
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main red
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    modal: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    inverse: '#ffffff',
    disabled: '#9ca3af',
  }
}

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
}

export const borderRadius = {
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}

// Komponente stilovi
export const componentStyles = {
  // Input stilovi
  input: {
    base: `
      w-full px-3 py-2.5 
      border border-gray-300 
      rounded-lg 
      bg-white
      text-gray-900
      placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
      transition-colors duration-200
    `,
    error: `
      border-red-300 
      focus:ring-red-500 focus:border-red-500
    `,
  },
  
  // Button stilovi
  button: {
    base: `
      inline-flex items-center justify-center
      px-4 py-2.5
      rounded-lg
      font-medium text-sm
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      cursor-pointer
    `,
    primary: `
      bg-blue-600 text-white
      hover:bg-blue-700
      focus:ring-blue-500
      shadow-sm
    `,
    secondary: `
      bg-gray-100 text-gray-900
      hover:bg-gray-200
      focus:ring-gray-500
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700
      focus:ring-green-500
    `,
    warning: `
      bg-orange-600 text-white
      hover:bg-orange-700
      focus:ring-orange-500
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus:ring-red-500
    `,
    outline: `
      border border-gray-300 bg-white text-gray-900
      hover:bg-gray-50
      focus:ring-blue-500
    `,
    // Additional button variants for quick actions
    indigo: `
      bg-indigo-600 text-white
      hover:bg-indigo-700
      focus:ring-indigo-500
    `,
    pink: `
      bg-pink-600 text-white
      hover:bg-pink-700
      focus:ring-pink-500
    `,
    teal: `
      bg-teal-600 text-white
      hover:bg-teal-700
      focus:ring-teal-500
    `,
    purple: `
      bg-purple-600 text-white
      hover:bg-purple-700
      focus:ring-purple-500
    `,
    orange: `
      bg-orange-600 text-white
      hover:bg-orange-700
      focus:ring-orange-500
    `,
  },
  
  // Modal stilovi
  modal: {
    overlay: `
      fixed inset-0 
      bg-black/20 backdrop-blur-sm
      flex items-center justify-center 
      z-50
      p-4
      modal-overlay
    `,
    container: `
      bg-white
      rounded-xl
      shadow-xl
      w-full max-w-2xl
      max-h-[90vh]
      overflow-y-auto
      modal-container
    `,
    header: `
      flex justify-between items-center
      px-6 py-4
      border-b border-gray-200
    `,
    content: `
      px-6 py-6
    `,
    closeButton: `
      text-gray-400 hover:text-gray-600
      transition-colors duration-200
    `,
  },
  
  // Card stilovi
  card: {
    base: `
      bg-white
      rounded-lg
      shadow-md
      border border-gray-200
    `,
    header: `
      px-6 py-4
      border-b border-gray-200
    `,
    content: `
      p-6
    `,
  },
  
  // Label stilovi
  label: `
    block text-sm font-medium text-gray-900 mb-2
  `,
  
  // Error message stilovi
  errorMessage: `
    mt-1 text-sm text-red-600
  `,
  
  // Success message stilovi
  successMessage: `
    mt-1 text-sm text-green-600
  `,
}

// Utility funkcije
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Helper funkcije za stilove
export const getInputClasses = (hasError?: boolean) => {
  return cn(
    componentStyles.input.base,
    hasError && componentStyles.input.error
  )
}

export const getButtonClasses = (variant: keyof typeof componentStyles.button) => {
  return cn(
    componentStyles.button.base,
    componentStyles.button[variant]
  )
} 