# 🔄 Git Revert Guide

## Understanding Git Revert vs Reset

- **`git revert`**: Creates a new commit that undoes changes (safe for shared repositories)
- **`git reset`**: Moves the branch pointer backward (dangerous for shared repositories)

## Basic Revert Commands

### 1. Revert Last Commit
```bash
# Revert the most recent commit
git revert HEAD

# Revert with custom message
git revert HEAD -m "Revert: Fix issue with admin system"

# Revert without creating commit (stage changes only)
git revert HEAD --no-commit
```

### 2. Revert Specific Commit
```bash
# Find commit hash first
git log --oneline

# Revert specific commit by hash
git revert <commit-hash>

# Example
git revert a1b2c3d4

# Revert multiple commits
git revert <commit-hash-1> <commit-hash-2>
```

### 3. Revert Range of Commits
```bash
# Revert commits from HEAD to 3 commits back
git revert HEAD~3..HEAD

# Revert range without creating individual commits
git revert HEAD~3..HEAD --no-commit
```

## Advanced Revert Scenarios

### 4. Revert Merge Commits
```bash
# List merge commits
git log --merges --oneline

# Revert merge commit (specify parent)
git revert -m 1 <merge-commit-hash>

# -m 1 means revert to first parent (usually main branch)
# -m 2 means revert to second parent (usually feature branch)
```

### 5. Interactive Revert
```bash
# Start interactive revert for last 5 commits
git revert HEAD~5..HEAD --no-commit

# Review changes
git status
git diff --cached

# Commit when ready
git commit -m "Revert multiple commits"
```

## Specific Revert Scenarios

### 6. Revert File Changes Only
```bash
# Revert specific file to previous commit
git checkout HEAD~1 -- path/to/file.js

# Revert file to specific commit
git checkout <commit-hash> -- path/to/file.js

# Stage the reverted file
git add path/to/file.js
git commit -m "Revert file.js to previous version"
```

### 7. Revert Uncommitted Changes
```bash
# Discard all uncommitted changes
git checkout .

# Discard specific file changes
git checkout -- path/to/file.js

# Discard staged changes
git reset HEAD path/to/file.js
git checkout -- path/to/file.js

# Stash changes instead of discarding
git stash
git stash pop  # to restore later
```

## Working with Branches

### 8. Revert on Different Branches
```bash
# Create new branch for revert
git checkout -b revert-changes
git revert <commit-hash>

# Switch back to main branch
git checkout main

# Merge revert branch if needed
git merge revert-changes
```

### 9. Cherry-pick Revert to Another Branch
```bash
# Revert on current branch
git revert <commit-hash>

# Switch to target branch
git checkout target-branch

# Cherry-pick the revert commit
git cherry-pick <revert-commit-hash>
```

## Emergency Revert Procedures

### 10. Quick Production Fix
```bash
# If you need to quickly revert in production
git checkout main
git revert HEAD --no-edit
git push origin main

# Or revert specific commit
git revert <problematic-commit> --no-edit
git push origin main
```

### 11. Revert and Redeploy
```bash
# Revert problematic commit
git revert <commit-hash>

# Tag the revert for tracking
git tag -a v1.0.1-hotfix -m "Hotfix: Revert problematic changes"

# Push changes
git push origin main
git push origin v1.0.1-hotfix

# Rebuild Docker image
docker build -t ku-badminton-reservation:v1.0.1-hotfix .

# Deploy
docker-compose down
docker-compose up -d
```

## Checking What to Revert

### 12. Investigation Commands
```bash
# View commit history
git log --oneline -10

# View detailed commit info
git show <commit-hash>

# View changes in commit
git diff <commit-hash>^..<commit-hash>

# View file history
git log --follow -- path/to/file.js

# Find when bug was introduced
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

### 13. Preview Revert Changes
```bash
# See what revert would do (dry run)
git revert --no-commit <commit-hash>
git diff --cached
git reset HEAD  # cancel the revert
```

## Common Revert Patterns

### 14. Revert Admin System Changes
```bash
# Find commits related to admin system
git log --grep="admin" --oneline

# Or search by file changes
git log --oneline -- src/container/admin/

# Revert specific admin changes
git revert <admin-commit-hash>
```

### 15. Revert Docker Configuration
```bash
# Find Docker-related commits
git log --oneline -- Dockerfile docker-compose.yml

# Revert Docker changes
git revert <docker-commit-hash>

# Rebuild after revert
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Best Practices

### 16. Safe Revert Workflow
```bash
# 1. Create backup branch
git checkout -b backup-before-revert

# 2. Switch back to main branch
git checkout main

# 3. Perform revert
git revert <commit-hash>

# 4. Test the revert
npm run build
npm run test

# 5. Push if everything works
git push origin main
```

### 17. Team Communication
```bash
# Create descriptive revert commit
git revert <commit-hash> -m "Revert: Admin system changes causing login issues

This reverts commit <commit-hash>.
Reason: The admin system changes introduced in this commit
are causing authentication failures for regular users.

Fixes: #123
Related: #124"
```

## Recovery from Mistakes

### 18. Undo a Revert
```bash
# If you need to undo a revert (revert the revert)
git log --oneline  # find the revert commit
git revert <revert-commit-hash>
```

### 19. Reset if Revert Goes Wrong (Local Only)
```bash
# DANGER: Only use if you haven't pushed yet
git reset --hard HEAD~1  # removes last commit completely

# Safer option: reset but keep changes
git reset --soft HEAD~1  # keeps changes staged
```

## Quick Reference

```bash
# Most common revert commands
git revert HEAD                    # Revert last commit
git revert <commit-hash>          # Revert specific commit
git revert HEAD~3..HEAD           # Revert last 3 commits
git revert -m 1 <merge-commit>    # Revert merge commit
git checkout -- <file>           # Discard file changes
git reset HEAD <file>             # Unstage file
```

Remember: **Always test after reverting and communicate with your team!**