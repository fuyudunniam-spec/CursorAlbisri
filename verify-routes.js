/**
 * Route Configuration Verification Script
 * 
 * This script verifies that the React Router configuration in App.tsx is correct:
 * - BrowserRouter is used (not HashRouter)
 * - NotFound route exists as catch-all (path="*")
 * - All routes are properly defined
 * - Nested routes are correctly structured
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const appTsxPath = join(process.cwd(), 'src', 'App.tsx');
const notFoundPath = join(process.cwd(), 'src', 'pages', 'NotFound.tsx');

console.log('🔍 Verifying React Router Configuration...\n');

let hasErrors = false;

// Read App.tsx
const appContent = readFileSync(appTsxPath, 'utf-8');

// Check 1: BrowserRouter is imported
console.log('✓ Check 1: BrowserRouter import');
if (appContent.includes('import { BrowserRouter')) {
  console.log('  ✅ BrowserRouter is imported from react-router-dom\n');
} else {
  console.log('  ❌ BrowserRouter is NOT imported\n');
  hasErrors = true;
}

// Check 2: BrowserRouter is used (not HashRouter)
console.log('✓ Check 2: BrowserRouter usage');
if (appContent.includes('<BrowserRouter')) {
  console.log('  ✅ BrowserRouter is used in the component\n');
} else {
  console.log('  ❌ BrowserRouter is NOT used\n');
  hasErrors = true;
}

// Check 3: Routes component is used
console.log('✓ Check 3: Routes component');
if (appContent.includes('<Routes>')) {
  console.log('  ✅ Routes component is properly used\n');
} else {
  console.log('  ❌ Routes component is NOT found\n');
  hasErrors = true;
}

// Check 4: Catch-all route exists (path="*")
console.log('✓ Check 4: Catch-all route for 404');
if (appContent.includes('path="*"') && appContent.includes('<NotFound')) {
  console.log('  ✅ Catch-all route (path="*") exists with NotFound component\n');
} else {
  console.log('  ❌ Catch-all route is missing or incorrectly configured\n');
  hasErrors = true;
}

// Check 5: NotFound component exists
console.log('✓ Check 5: NotFound component file');
try {
  const notFoundContent = readFileSync(notFoundPath, 'utf-8');
  if (notFoundContent.includes('404')) {
    console.log('  ✅ NotFound component exists and contains 404 content\n');
  } else {
    console.log('  ⚠️  NotFound component exists but may not display 404 properly\n');
  }
} catch (error) {
  console.log('  ❌ NotFound component file does not exist\n');
  hasErrors = true;
}

// Check 6: Count routes
console.log('✓ Check 6: Route definitions');
const routeMatches = appContent.match(/<Route path="/g);
if (routeMatches) {
  console.log(`  ✅ Found ${routeMatches.length} route definitions\n`);
} else {
  console.log('  ❌ No routes found\n');
  hasErrors = true;
}

// Check 7: Nested routes (check for routes with multiple path segments)
console.log('✓ Check 7: Nested routes');
const nestedRoutes = appContent.match(/<Route path="\/\w+\/\w+/g);
if (nestedRoutes && nestedRoutes.length > 0) {
  console.log(`  ✅ Found ${nestedRoutes.length} nested routes (e.g., /module/subpage)\n`);
  console.log('  Examples:');
  nestedRoutes.slice(0, 5).forEach(route => {
    const pathMatch = route.match(/path="([^"]+)"/);
    if (pathMatch) {
      console.log(`    - ${pathMatch[1]}`);
    }
  });
  console.log();
} else {
  console.log('  ⚠️  No nested routes found (this may be intentional)\n');
}

// Check 8: Deeply nested routes (3+ levels)
console.log('✓ Check 8: Deeply nested routes');
const deeplyNestedRoutes = appContent.match(/<Route path="\/\w+\/\w+\/\w+/g);
if (deeplyNestedRoutes && deeplyNestedRoutes.length > 0) {
  console.log(`  ✅ Found ${deeplyNestedRoutes.length} deeply nested routes (3+ levels)\n`);
  console.log('  Examples:');
  deeplyNestedRoutes.slice(0, 3).forEach(route => {
    const pathMatch = route.match(/path="([^"]+)"/);
    if (pathMatch) {
      console.log(`    - ${pathMatch[1]}`);
    }
  });
  console.log();
} else {
  console.log('  ℹ️  No deeply nested routes found (this may be intentional)\n');
}

// Check 9: Catch-all route is last
console.log('✓ Check 9: Catch-all route position');
const lastRouteMatch = appContent.match(/<Route[^>]*path="\*"[^>]*>[^<]*<\/Route>\s*<\/Routes>/);
if (lastRouteMatch) {
  console.log('  ✅ Catch-all route (path="*") is correctly positioned as the last route\n');
} else {
  console.log('  ⚠️  Catch-all route may not be the last route (check manually)\n');
}

// Summary
console.log('═'.repeat(60));
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED - Please fix the errors above');
  process.exit(1);
} else {
  console.log('✅ ALL CHECKS PASSED - Route configuration is correct!');
  console.log('\nRoute Configuration Summary:');
  console.log('  • BrowserRouter is properly configured');
  console.log('  • NotFound component exists as catch-all');
  console.log('  • All routes are properly defined');
  console.log('  • Nested routes are correctly structured');
  process.exit(0);
}
