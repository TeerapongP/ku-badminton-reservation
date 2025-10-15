#!/usr/bin/env ts-node

/**
 * Script to check API error handling coverage
 * This script will scan all API files and report which ones have error handling
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = 'src/app/api';

interface ApiFileStatus {
  path: string;
  hasErrorHandler: boolean;
  hasMiddleware: boolean;
  methods: string[];
  issues: string[];
}

function findApiFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function analyzeApiFile(filePath: string): ApiFileStatus {
  const content = readFileSync(filePath, 'utf-8');
  const issues: string[] = [];
  
  // Check for error handling imports
  const hasErrorHandler = content.includes('withErrorHandler') || 
                         content.includes('@/lib/error-handler');
  
  const hasMiddleware = content.includes('withMiddleware') || 
                       content.includes('@/lib/api-middleware');
  
  // Extract HTTP methods
  const methodRegex = /export\s+(?:async\s+function\s+(GET|POST|PUT|DELETE|PATCH)|const\s+(GET|POST|PUT|DELETE|PATCH)\s*=)/g;
  const methods: string[] = [];
  let match;
  
  while ((match = methodRegex.exec(content)) !== null) {
    const method = match[1] || match[2];
    if (method && !methods.includes(method)) {
      methods.push(method);
    }
  }
  
  // Check for common issues
  if (methods.length === 0) {
    issues.push('No HTTP methods found');
  }
  
  if (!hasErrorHandler && methods.length > 0) {
    issues.push('Missing error handler');
  }
  
  if (!hasMiddleware && methods.length > 0) {
    issues.push('Missing middleware');
  }
  
  // Check for old-style try-catch without error handler
  if (content.includes('try {') && content.includes('catch') && !hasErrorHandler) {
    issues.push('Uses old-style try-catch without error handler');
  }
  
  // Check for direct NextResponse.json error returns
  if (content.includes('NextResponse.json') && 
      content.includes('status: 500') && 
      !hasErrorHandler) {
    issues.push('Uses direct error responses instead of error handler');
  }
  
  // Check for missing validation
  if ((methods.includes('POST') || methods.includes('PUT')) && 
      !content.includes('validate') && 
      !content.includes('validateRequired')) {
    issues.push('Missing input validation for POST/PUT methods');
  }
  
  return {
    path: filePath,
    hasErrorHandler,
    hasMiddleware,
    methods,
    issues
  };
}

function generateReport(apiFiles: ApiFileStatus[]): void {
  console.log('📊 API Error Handling Coverage Report\n');
  console.log('=' .repeat(60));
  
  const totalFiles = apiFiles.length;
  const filesWithErrorHandler = apiFiles.filter(f => f.hasErrorHandler).length;
  const filesWithMiddleware = apiFiles.filter(f => f.hasMiddleware).length;
  const filesWithIssues = apiFiles.filter(f => f.issues.length > 0).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total API files: ${totalFiles}`);
  console.log(`  With error handler: ${filesWithErrorHandler} (${Math.round(filesWithErrorHandler/totalFiles*100)}%)`);
  console.log(`  With middleware: ${filesWithMiddleware} (${Math.round(filesWithMiddleware/totalFiles*100)}%)`);
  console.log(`  With issues: ${filesWithIssues} (${Math.round(filesWithIssues/totalFiles*100)}%)`);
  
  // Files with good error handling
  const goodFiles = apiFiles.filter(f => f.hasErrorHandler && f.hasMiddleware && f.issues.length === 0);
  if (goodFiles.length > 0) {
    console.log(`\n✅ Files with complete error handling (${goodFiles.length}):`);
    goodFiles.forEach(file => {
      console.log(`  ✓ ${file.path} [${file.methods.join(', ')}]`);
    });
  }
  
  // Files needing updates
  const needsUpdate = apiFiles.filter(f => !f.hasErrorHandler || !f.hasMiddleware || f.issues.length > 0);
  if (needsUpdate.length > 0) {
    console.log(`\n⚠️  Files needing updates (${needsUpdate.length}):`);
    needsUpdate.forEach(file => {
      console.log(`\n  📁 ${file.path}`);
      console.log(`     Methods: ${file.methods.join(', ') || 'None'}`);
      console.log(`     Error Handler: ${file.hasErrorHandler ? '✓' : '❌'}`);
      console.log(`     Middleware: ${file.hasMiddleware ? '✓' : '❌'}`);
      if (file.issues.length > 0) {
        console.log(`     Issues:`);
        file.issues.forEach(issue => {
          console.log(`       - ${issue}`);
        });
      }
    });
  }
  
  // Method distribution
  const methodCounts: Record<string, number> = {};
  apiFiles.forEach(file => {
    file.methods.forEach(method => {
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
  });
  
  if (Object.keys(methodCounts).length > 0) {
    console.log(`\n📊 HTTP Method Distribution:`);
    Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([method, count]) => {
        console.log(`  ${method}: ${count} endpoints`);
      });
  }
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  
  if (filesWithErrorHandler < totalFiles) {
    console.log(`  1. Add error handlers to ${totalFiles - filesWithErrorHandler} remaining files`);
  }
  
  if (filesWithMiddleware < totalFiles) {
    console.log(`  2. Add middleware to ${totalFiles - filesWithMiddleware} remaining files`);
  }
  
  if (filesWithIssues > 0) {
    console.log(`  3. Fix issues in ${filesWithIssues} files`);
  }
  
  const postPutFiles = apiFiles.filter(f => 
    (f.methods.includes('POST') || f.methods.includes('PUT')) && 
    !f.hasErrorHandler
  ).length;
  
  if (postPutFiles > 0) {
    console.log(`  4. Add validation to ${postPutFiles} POST/PUT endpoints`);
  }
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`  1. Run the update script for remaining files`);
  console.log(`  2. Test all endpoints after updates`);
  console.log(`  3. Monitor error rates in production`);
  console.log(`  4. Set up automated API testing`);
  
  console.log('\n' + '='.repeat(60));
}

function main() {
  console.log('🔍 Scanning API files for error handling coverage...\n');
  
  try {
    const apiFiles = findApiFiles(API_DIR);
    const analysis = apiFiles.map(analyzeApiFile);
    
    generateReport(analysis);
    
    const hasIssues = analysis.some(f => f.issues.length > 0 || !f.hasErrorHandler || !f.hasMiddleware);
    
    if (!hasIssues) {
      console.log('\n🎉 All API files have proper error handling!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some API files need attention.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing API files:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { analyzeApiFile, findApiFiles };