#!/usr/bin/env ts-node

/**
 * Script to update remaining API files with comprehensive error handling
 * This script will add error handling to all remaining API routes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = 'src/app/api';

// Template for basic API error handling
const ERROR_HANDLER_IMPORTS = `import { 
  withErrorHandler, 
  CustomApiError,
  ERROR_CODES,
  HTTP_STATUS,
  successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";`;

// List of files that have already been updated
const UPDATED_FILES = [
    'src/app/api/auth/register/route.ts',
    'src/app/api/auth/login-security/route.ts',
    'src/app/api/provinces/route.ts',
    'src/app/api/faculties/route.ts',
    'src/app/api/upload/profile-image/route.ts',
    'src/app/api/court-details/route.ts',
    'src/app/api/units/route.ts',
    'src/app/api/districts/route.ts',
    'src/app/api/departments/route.ts',
    'src/app/api/courts/route.ts',
];

interface ApiFile {
    path: string;
    content: string;
    methods: string[];
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

function extractHttpMethods(content: string): string[] {
    const methods: string[] = [];
    const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
        methods.push(match[1]);
    }

    return methods;
}

function updateApiFile(filePath: string): boolean {
    try {
        console.log(`Processing: ${filePath}`);

        // Skip if already updated
        if (UPDATED_FILES.includes(filePath)) {
            console.log(`  ✓ Already updated, skipping`);
            return true;
        }

        const content = readFileSync(filePath, 'utf-8');

        // Skip if already has error handling
        if (content.includes('withErrorHandler') || content.includes('@/lib/error-handler')) {
            console.log(`  ✓ Already has error handling, skipping`);
            return true;
        }

        const methods = extractHttpMethods(content);
        if (methods.length === 0) {
            console.log(`  ⚠ No HTTP methods found, skipping`);
            return true;
        }

        console.log(`  📝 Found methods: ${methods.join(', ')}`);

        let updatedContent = content;

        // Add imports
        const importRegex = /import.*from.*['"][^'"]*['"];?\s*\n/g;
        const imports = content.match(importRegex) || [];
        const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '');

        if (lastImportIndex !== -1) {
            const insertPosition = lastImportIndex + (imports[imports.length - 1]?.length || 0);
            updatedContent =
                updatedContent.slice(0, insertPosition) +
                '\n' + ERROR_HANDLER_IMPORTS + '\n' +
                updatedContent.slice(insertPosition);
        }

        // Update each method
        for (const method of methods) {
            updatedContent = updateMethod(updatedContent, method, filePath);
        }

        writeFileSync(filePath, updatedContent);
        console.log(`  ✅ Updated successfully`);
        return true;

    } catch (error) {
        console.error(`  ❌ Error updating ${filePath}:`, error);
        return false;
    }
}

function updateMethod(content: string, method: string, filePath: string): string {
    const methodRegex = new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)^}`,
        'gm'
    );

    return content.replace(methodRegex, (match, methodBody) => {
        // Extract function signature
        const signatureMatch = match.match(/export\s+async\s+function\s+\w+\s*\([^)]*\)/);
        if (!signatureMatch) return match;

        const signature = signatureMatch[0];
        const handlerName = `${method.toLowerCase()}Handler`;

        // Create handler function
        const handlerFunction = `async function ${handlerName}${signature.replace(`export async function ${method}`, '')} {
  ${methodBody.trim()}
}`;

        // Create export with middleware
        const rateLimit = getRateLimit(filePath, method);
        const middlewareOptions = getMiddlewareOptions(method, rateLimit);

        const exportStatement = `
export const ${method} = withMiddleware(
    withErrorHandler(${handlerName}),
    ${middlewareOptions}
);`;

        return handlerFunction + exportStatement;
    });
}

function getRateLimit(filePath: string, method: string): string {
    if (filePath.includes('/auth/')) return 'auth';
    if (filePath.includes('/upload/')) return 'upload';
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') return 'sensitive';
    return 'default';
}

function getMiddlewareOptions(method: string, rateLimit: string): string {
    const options: string[] = [];

    options.push(`methods: ['${method}']`);
    options.push(`rateLimit: '${rateLimit}'`);

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (rateLimit !== 'upload') {
            options.push(`requireContentType: 'application/json'`);
            options.push(`maxBodySize: 10 * 1024`); // 10KB
        }
    }

    return `{\n        ${options.join(',\n        ')}\n    }`;
}

function addBasicErrorHandling(content: string): string {
    // Add try-catch blocks where missing
    const functionRegex = /(async function \w+Handler[^{]*{)([\s\S]*?)(^})/gm;

    return content.replace(functionRegex, (match, start, body, end) => {
        // Check if already has try-catch
        if (body.trim().startsWith('try {')) {
            return match;
        }

        // Wrap in try-catch
        const wrappedBody = `
    try {
        ${body.trim()}
    } catch (error) {
        throw error; // Let withErrorHandler handle it
    }`;

        return start + wrappedBody + '\n' + end;
    });
}

function main() {
    console.log('🚀 Starting API error handling update...\n');

    const apiFiles = findApiFiles(API_DIR);
    console.log(`Found ${apiFiles.length} API files\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of apiFiles) {
        if (updateApiFile(file)) {
            successCount++;
        } else {
            errorCount++;
        }
        console.log('');
    }

    console.log('📊 Summary:');
    console.log(`  ✅ Successfully updated: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📁 Total files: ${apiFiles.length}`);

    if (errorCount === 0) {
        console.log('\n🎉 All API files have been updated with error handling!');
    } else {
        console.log('\n⚠️  Some files had errors. Please check them manually.');
    }
}

if (require.main === module) {
    main();
}

export { updateApiFile, findApiFiles };