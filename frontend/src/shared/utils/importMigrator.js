/**
 * Import Migration Utility
 * Utilities to help migrate import statements to new structure
 */

// Import path mappings from old to new structure
const importMappings = {
  // Shared utilities
  '../utils/': '@shared/utils/',
  '../../utils/': '@shared/utils/',
  '../../../utils/': '@shared/utils/',

  // Shared components
  '../components/': '@shared/components/',
  '../../components/': '@shared/components/',
  '../../../components/': '@shared/components/',

  // Shared hooks
  '../hooks/': '@shared/hooks/',
  '../../hooks/': '@shared/hooks/',
  '../../../hooks/': '@shared/hooks/',

  // Shared services
  '../services/': '@shared/services/',
  '../../services/': '@shared/services/',
  '../../../services/': '@shared/services/',

  // Store
  '../store': '@shared/store',
  '../../store': '@shared/store',
  '../../../store': '@shared/store',

  // Theme and styles
  '../theme/': '@shared/theme/',
  '../../theme/': '@shared/theme/',
  '../styles/': '@shared/styles/',
  '../../styles/': '@shared/styles/',

  // Features
  '../features/': '@features/',
  '../../features/': '@features/',
  '../../../features/': '@features/',

  // Config
  '../config': '@config',
  '../../config': '@config',
  '../../../config': '@config',

  // Contexts
  '../contexts/': '@shared/contexts/',
  '../../contexts/': '@shared/contexts/',
  '../../../contexts/': '@shared/contexts/'
};

// Component path mappings for feature-based organization
const componentMappings = {
  // Auth components
  'components/pages/LoginPage': '@features/auth/pages/LoginPage',
  'components/pages/SignupPage': '@features/auth/pages/SignupPage',
  'components/pages/PasswordResetPage': '@features/auth/pages/PasswordResetPage',
  'components/loginandSignup/': '@features/auth/components/',

  // Course components
  'components/courses/': '@features/courses/components/',
  'components/module/': '@features/learning/components/',

  // Dashboard components
  'components/dashboard/': '@features/dashboard/components/',
  'components/guardian/': '@features/dashboard/components/',

  // Payment components
  'components/payments/': '@features/payments/components/',

  // Admin components
  'components/admin/': '@features/admin/components/',
  'components/pages/AdminPage': '@features/admin/pages/AdminPage',

  // Quiz and learning
  'components/quiz/': '@features/learning/components/',

  // Common components to shared
  'components/common/': '@shared/components/',
  'components/modals/': '@shared/components/modals/',

  // Notifications
  'components/notifications/': '@features/notifications/components/',

  // Chat
  'components/chat/': '@features/chat/components/',

  // Calendar
  'components/calendar/': '@features/calendar/components/',

  // Session management
  'components/sessions/': '@features/sessions/components/',
  'components/tutor/': '@features/tutor/components/',
  'components/availability/': '@features/availability/components/',

  // Student components
  'components/student/': '@features/student/components/',

  // General/public components
  'components/general/': '@components/general/',
  'components/headerandfooter/': '@components/layout/',

  // Invoices
  'components/invoices/': '@features/billing/components/',

  // Misc components
  'components/misc/': '@shared/components/misc/'
};

// Update import path
export const updateImportPath = (importPath, currentFilePath) => {
  // Don't update node_modules imports
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  // Check for direct component mappings first
  for (const [oldPath, newPath] of Object.entries(componentMappings)) {
    if (importPath.includes(oldPath)) {
      return importPath.replace(oldPath, newPath);
    }
  }

  // Check for general path mappings
  for (const [oldPath, newPath] of Object.entries(importMappings)) {
    if (importPath.startsWith(oldPath)) {
      return importPath.replace(oldPath, newPath);
    }
  }

  // Handle relative paths that need conversion
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // This would need file-specific logic based on current location
    // For now, return as-is and handle manually
    return importPath;
  }

  return importPath;
};

// Extract import statements from file content
export const extractImports = (content) => {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"];?/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      fullMatch: match[0],
      importPath: match[1],
      index: match.index
    });
  }

  return imports;
};

// Update all imports in file content
export const updateImportsInContent = (content, filePath) => {
  const imports = extractImports(content);
  let updatedContent = content;
  let offset = 0;

  imports.forEach(importInfo => {
    const newPath = updateImportPath(importInfo.importPath, filePath);
    if (newPath !== importInfo.importPath) {
      const newImportStatement = importInfo.fullMatch.replace(importInfo.importPath, newPath);
      const startIndex = importInfo.index + offset;
      const endIndex = startIndex + importInfo.fullMatch.length;

      updatedContent = updatedContent.substring(0, startIndex) +
                      newImportStatement +
                      updatedContent.substring(endIndex);

      offset += newImportStatement.length - importInfo.fullMatch.length;
    }
  });

  return updatedContent;
};

// Validate import paths
export const validateImportPath = (importPath) => {
  const issues = [];

  // Check for deprecated patterns
  if (importPath.includes('../../../')) {
    issues.push('Deep relative imports (../../../) should use absolute imports');
  }

  if (importPath.includes('/components/') && !importPath.startsWith('@')) {
    issues.push('Component imports should use feature-based paths');
  }

  if (importPath.includes('/utils/') && !importPath.startsWith('@shared/utils/')) {
    issues.push('Utility imports should use @shared/utils/');
  }

  return issues;
};

// Generate import suggestions
export const generateImportSuggestions = (importPath) => {
  const suggestions = [];

  // Suggest feature-based imports for components
  if (importPath.includes('/components/')) {
    Object.entries(componentMappings).forEach(([oldPath, newPath]) => {
      if (importPath.includes(oldPath)) {
        suggestions.push(`Consider using: ${importPath.replace(oldPath, newPath)}`);
      }
    });
  }

  // Suggest shared imports for utilities
  if (importPath.includes('/utils/') || importPath.includes('/hooks/')) {
    suggestions.push(`Consider using @shared/ prefix for shared utilities`);
  }

  return suggestions;
};

// Report import analysis
export const analyzeImports = (content, filePath) => {
  const imports = extractImports(content);
  const analysis = {
    totalImports: imports.length,
    relativeImports: 0,
    deepRelativeImports: 0,
    needsMigration: [],
    suggestions: []
  };

  imports.forEach(importInfo => {
    if (importInfo.importPath.startsWith('.')) {
      analysis.relativeImports++;

      if (importInfo.importPath.includes('../../../')) {
        analysis.deepRelativeImports++;
      }

      const issues = validateImportPath(importInfo.importPath);
      if (issues.length > 0) {
        analysis.needsMigration.push({
          importPath: importInfo.importPath,
          issues
        });
      }

      const suggestions = generateImportSuggestions(importInfo.importPath);
      if (suggestions.length > 0) {
        analysis.suggestions.push({
          importPath: importInfo.importPath,
          suggestions
        });
      }
    }
  });

  return analysis;
};

export default {
  updateImportPath,
  extractImports,
  updateImportsInContent,
  validateImportPath,
  generateImportSuggestions,
  analyzeImports,
  importMappings,
  componentMappings
};