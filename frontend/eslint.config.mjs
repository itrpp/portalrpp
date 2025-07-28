import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from '@eslint/js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      // Dependencies
      'node_modules/**/*',
      '.pnp',
      '.pnp.js',
      
      // Production builds
      '.next/**/*',
      'out/**/*',
      'dist/**/*',
      'build/**/*',
      
      // Coverage directory
      'coverage/**/*',
      '*.lcov',
      '.nyc_output',
      
      // Cache directories
      '.eslintcache',
      '.cache/**/*',
      '.parcel-cache/**/*',
      '.rpt2_cache/**/*',
      '.rts2_cache_cjs/**/*',
      '.rts2_cache_es/**/*',
      '.rts2_cache_umd/**/*',
      
      // Environment files
      '.env*',
      
      // Logs
      'logs/**/*',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      
      // TypeScript cache
      '*.tsbuildinfo',
      
      // Config files (to avoid circular dependencies)
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      
      // Editor files
      '.vscode/**/*',
      '.idea/**/*',
      '*.swp',
      '*.swo',
      '*~',
      
      // OS generated files
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db',
      
      // Temporary folders
      'tmp/**/*',
      'temp/**/*'
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      // Dependencies
      'node_modules/**/*',
      '.pnp',
      '.pnp.js',
      
      // Production builds
      '.next/**/*',
      'out/**/*',
      'dist/**/*',
      'build/**/*',
      
      // Coverage directory
      'coverage/**/*',
      '*.lcov',
      '.nyc_output',
      
      // Cache directories
      '.eslintcache',
      '.cache/**/*',
      '.parcel-cache/**/*',
      '.rpt2_cache/**/*',
      '.rts2_cache_cjs/**/*',
      '.rts2_cache_es/**/*',
      '.rts2_cache_umd/**/*',
      
      // Environment files
      '.env*',
      
      // Logs
      'logs/**/*',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      
      // TypeScript cache
      '*.tsbuildinfo',
      
      // Config files (to avoid circular dependencies)
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      
      // Editor files
      '.vscode/**/*',
      '.idea/**/*',
      '*.swp',
      '*.swo',
      '*~',
      
      // OS generated files
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db',
      
      // Temporary folders
      'tmp/**/*',
      'temp/**/*'
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      // Base rules
      ...js.configs.recommended.rules,
      
      // Next.js specific rules
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-css-tags': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-script-component-in-head': 'error',
      '@next/next/no-styled-jsx-in-document': 'error',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'arrow-parens': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'object-property-newline': 'error',
      'prefer-destructuring': 'error',
      'sort-imports': 'off',
      'import/order': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      // Dependencies
      'node_modules/**/*',
      '.pnp',
      '.pnp.js',
      
      // Production builds
      '.next/**/*',
      'out/**/*',
      'dist/**/*',
      'build/**/*',
      
      // Coverage directory
      'coverage/**/*',
      '*.lcov',
      '.nyc_output',
      
      // Cache directories
      '.eslintcache',
      '.cache/**/*',
      '.parcel-cache/**/*',
      '.rpt2_cache/**/*',
      '.rts2_cache_cjs/**/*',
      '.rts2_cache_es/**/*',
      '.rts2_cache_umd/**/*',
      
      // Environment files
      '.env*',
      
      // Logs
      'logs/**/*',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      
      // TypeScript cache
      '*.tsbuildinfo',
      
      // Config files (to avoid circular dependencies)
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      
      // Editor files
      '.vscode/**/*',
      '.idea/**/*',
      '*.swp',
      '*.swo',
      '*~',
      
      // OS generated files
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db',
      
      // Temporary folders
      'tmp/**/*',
      'temp/**/*'
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['**/*.config.js', '**/*.config.mjs', '**/*.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/pages/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
