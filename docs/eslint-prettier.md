# Comprehensive Code Quality Guide for Next.js Projects

This comprehensive guide outlines how to set up and maintain high code quality standards in Next.js projects using TypeScript, ESLint, and Prettier. It combines best practices for type safety and code style enforcement.

## Quick Start Setup

### 1. Installation

When setting up a newly created Next.js project, install all necessary dependencies:

```bash
# Install ESLint, Prettier, and related dependencies
yarn add -D eslint@^9 prettier@^3 @typescript-eslint/eslint-plugin@^8 @typescript-eslint/parser@^8 eslint-config-prettier@^10 eslint-config-next@^15 globals@^13
```

> ⚠️ **Important**: Don't forget to install the `globals` package. It's required for ESLint configuration but might not be installed automatically.

### 2. Configuration Files

Create the following configuration files in your project root:

#### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### ESLint Configuration (`eslint.config.js`)

```javascript
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        JSX: 'readonly',
        process: 'readonly',
        // Next.js specific globals
        Image: 'readonly',
        Link: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Allows for better inference in Next.js

      // Next.js specific rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'jsx-a11y/anchor-is-valid': 'off', // Next.js Link component handles this

      // Error rules (no warnings)
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Formatting rules
      indent: ['error', 2],
      'comma-spacing': ['error', { before: false, after: true }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', 'never'],
      'space-infix-ops': ['error'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': ['error', 'always'],
      'func-call-spacing': ['error', 'never'],

      // Next.js font handling
      'new-cap': [
        'error',
        {
          newIsCap: true,
          capIsNew: false, // Allow capitalized functions without new
          newIsCapExceptions: [],
          capIsNewExceptions: [
            'Inter',
            'Roboto',
            'Arial',
            'Helvetica',
            'Georgia',
            'Merriweather',
          ], // Next.js font functions
        },
      ],

      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-trailing-spaces': 'error',
      'padded-blocks': ['error', 'never'],
    },
  },
  // Next.js app directory specific config
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'import/prefer-default-export': 'off',
      'react/function-component-definition': 'off',
    },
  },
  prettier,
];
```

#### Prettier Configuration (`.prettierrc`)

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "semi": true,
  "trailingComma": "all",
  "useTabs": false
}
```

#### Package.json Updates

Add the following to your `package.json` file:

```json
{
  "type": "module",
  "scripts": {
    "lint": "eslint \"src/**/*.{js,jsx,ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{js,jsx,ts,tsx}\" --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md,mdx,css,html}\""
  }
}
```

> ⚠️ **Important**: The `"type": "module"` field is critical when using ESLint v9 with the flat config format.

## TypeScript Strictness Settings Explained

### Core Strictness Settings

- **`strict: true`**: Enables all strict type-checking options, including:
  - `noImplicitAny`: No implicit 'any' types
  - `strictNullChecks`: Makes null/undefined handling explicit
  - `strictFunctionTypes`: Better function parameter typing
  - `strictBindCallApply`: Stricter bind/call/apply typing
  - `strictPropertyInitialization`: Ensures class properties are initialized
  - `noImplicitThis`: No implicit 'this'
  - `alwaysStrict`: Uses JavaScript's strict mode

### Enhanced Strictness Settings

- **`noUncheckedIndexedAccess: true`**: Makes array and object access safer by adding `undefined` to indexed access types
- **`exactOptionalPropertyTypes: true`**: Distinguishes between absent optional properties and properties with undefined values
- **`noImplicitOverride: true`**: Requires explicit override keyword for method overrides

## Code Examples

### Example 1: TypeScript Strict Null Checking

```typescript
// Without strictNullChecks (dangerous):
function getUserName(userId: string) {
  const user = fetchUser(userId); // Might return null
  return user.name; // Potential runtime error!
}

// With strictNullChecks (safe):
function getUserName(userId: string): string | null {
  const user = fetchUser(userId); // Type: User | null
  return user ? user.name : null; // Safe handling
}
```

### Example 2: Array Access with noUncheckedIndexedAccess

```typescript
// Without noUncheckedIndexedAccess (dangerous):
function getFirstItem(items: string[]) {
  return items[0].toUpperCase(); // Could cause runtime error if empty array
}

// With noUncheckedIndexedAccess (safe):
function getFirstItem(items: string[]): string | undefined {
  const first = items[0]; // Type: string | undefined
  return first?.toUpperCase(); // Safe handling
}
```

### Example 3: ESLint and Prettier Working Together

```typescript
// Bad code (will be caught by ESLint/Prettier):
function badlyFormattedFunction(param: string) {
  if (param == 'test') {
    console.log('Found it!');
    return true;
  } else {
    var x = 5;
    return false;
  }
}

// Good code (passes ESLint/Prettier):
function properlyFormattedFunction(param: string): boolean {
  if (param === 'test') {
    // console.log('Found it!'); // Would be caught by no-console rule
    return true;
  } else {
    const x = 5; // const instead of var
    return false;
  }
}
```

### Example 4: Next.js Component with All Rules Applied

```tsx
type UserProfile = {
  id: string;
  name: string;
  email?: string; // Optional with exactOptionalPropertyTypes
  posts?: Array<{
    id: string;
    title: string;
  }>;
};

type ProfileProps = {
  user: UserProfile;
  highlightedPostId?: string;
};

export default function ProfileComponent({
  user,
  highlightedPostId,
}: ProfileProps) {
  // Safe array access with noUncheckedIndexedAccess
  const highlightedPost = user.posts?.find(
    (post) => post.id === highlightedPostId,
  );

  return (
    <div className="p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold">{user.name}</h1>

      {user.email && <p className="text-gray-600">{user.email}</p>}

      {user.posts && user.posts.length > 0 ? (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Posts</h2>
          <ul className="mt-2 space-y-2">
            {user.posts.map((post) => (
              <li
                key={post.id}
                className={post.id === highlightedPostId ? 'font-bold' : ''}
              >
                {post.title}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">No posts available</p>
      )}

      {highlightedPost && (
        <div className="mt-6 p-3 bg-yellow-50 rounded">
          <h3 className="font-medium">Highlighted Post</h3>
          <p>{highlightedPost.title}</p>
        </div>
      )}
    </div>
  );
}
```

## Common Issues and Solutions

### ESLint Issues

1. **Module parsing warnings**: Add `"type": "module"` to your package.json
2. **Missing globals package**: Run `yarn add -D globals`
3. **New-cap warnings with Next.js fonts**: The provided config already handles this with `capIsNewExceptions`

### TypeScript Issues

1. **Type errors in third-party libraries**: Use `skipLibCheck: true` and consider adding declaration files
2. **API data typing**: Create interfaces for API responses or use code generators
3. **Gradual migration**: Use `// @ts-expect-error` comments temporarily with explanations
4. **Dynamic content**: Use type assertions (`as Type`) and type guards (`typeof x === 'string'`)

## Usage Commands

- **Check for linting issues**: `yarn lint`
- **Automatically fix linting issues**: `yarn lint:fix`
- **Format code with Prettier**: `yarn format`

## Benefits of This Configuration

1. **Catches errors at compile time**: Most type and style errors never make it to runtime
2. **Consistent code style**: Automated formatting and style rules ensure consistency
3. **Better developer experience**: Enhanced autocomplete and inline documentation
4. **Safer refactoring**: The type system catches issues when changing code
5. **Self-documenting code**: Types and consistent style serve as documentation

## Conclusion

This configuration provides a robust foundation for high-quality Next.js projects. While it requires more initial effort, it substantially reduces bugs, improves maintainability, and enhances developer productivity throughout the project lifecycle.
