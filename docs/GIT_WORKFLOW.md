# Git Workflow and Branching Strategy

This document outlines the Git workflow and branching strategy for the Row The Boat project. Following these guidelines ensures a consistent and efficient development process.

## Table of Contents

1. [Branching Strategy](#branching-strategy)
2. [Branch Naming Conventions](#branch-naming-conventions)
3. [Commit Message Guidelines](#commit-message-guidelines)
4. [Pull Request Process](#pull-request-process)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Merging Strategy](#merging-strategy)
7. [Release Process](#release-process)
8. [Hotfix Process](#hotfix-process)

## Branching Strategy

The project follows a simplified Git flow branching model with the following branches:

### Main Branches

- **`main`**: The production branch. This branch always reflects the current production state.
- **`develop`**: The development branch. This branch contains the latest development changes.

### Supporting Branches

- **Feature Branches**: For new features and non-emergency bug fixes
- **Fix Branches**: For bug fixes
- **Hotfix Branches**: For critical bug fixes that need to be applied to production immediately
- **Release Branches**: For preparing releases

## Branch Naming Conventions

Branches should be named according to the following conventions:

- **Feature branches**: `feature/short-description`
- **Bug fix branches**: `fix/short-description` or `fix/issue-number`
- **Hotfix branches**: `hotfix/short-description` or `hotfix/issue-number`
- **Release branches**: `release/version-number`

Examples:
- `feature/user-authentication`
- `fix/login-validation`
- `fix/issue-123`
- `hotfix/critical-security-issue`
- `release/1.2.0`

## Commit Message Guidelines

The project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This leads to more readable messages that are easy to follow when looking through the project history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Examples

```
feat(auth): add user authentication

Implement JWT-based authentication for user login and registration.
```

```
fix(api): correct status code for validation errors

Change HTTP status code from 500 to 400 for validation errors.
Closes #123
```

## Pull Request Process

1. **Create a branch** from `develop` (or `main` for hotfixes)
2. **Make your changes** in the branch
3. **Test your changes** thoroughly
4. **Push your branch** to the remote repository
5. **Create a pull request** to merge your branch into `develop` (or `main` for hotfixes)
6. **Request reviews** from team members
7. **Address review comments** and make necessary changes
8. **Merge the pull request** once approved

### Pull Request Template

When creating a pull request, use the following template:

```markdown
## Description
Brief description of the changes

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests that you ran to verify your changes

## Checklist:
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Code Review Guidelines

### Reviewer Responsibilities

- Review code within 24 hours of being assigned
- Check for code quality, readability, and maintainability
- Verify that tests are included and passing
- Ensure documentation is updated
- Provide constructive feedback

### Author Responsibilities

- Respond to review comments promptly
- Explain design decisions when necessary
- Be open to feedback and suggestions
- Make requested changes or explain why they shouldn't be made

## Merging Strategy

The project allows direct merging to the `main` branch without requiring a pull request process, but the following guidelines should be followed:

1. **Feature and fix branches** should be merged into `develop` first
2. **Hotfix branches** can be merged directly into `main` and then back-merged into `develop`
3. **Release branches** are merged into `main` and then back-merged into `develop`

### Merge Methods

- **Squash and merge** is preferred for feature branches to keep the history clean
- **Merge commit** is preferred for release and hotfix branches to preserve the commit history

## Release Process

1. Create a `release/x.y.z` branch from `develop`
2. Make any final adjustments and version bumps
3. Run comprehensive tests
4. Merge the release branch into `main`
5. Tag the release in `main` with the version number
6. Back-merge the release branch into `develop`

### Versioning

The project follows [Semantic Versioning](https://semver.org/) (SemVer) for version numbers:

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

## Hotfix Process

For critical issues that need to be fixed in production:

1. Create a `hotfix/description` branch from `main`
2. Fix the issue and increment the patch version
3. Run comprehensive tests
4. Merge the hotfix branch into `main`
5. Tag the release in `main` with the new version number
6. Back-merge the hotfix branch into `develop`

## Git Commands Reference

### Creating a Feature Branch

```bash
git checkout develop
git pull
git checkout -b feature/my-feature
```

### Committing Changes

```bash
git add .
git commit -m "feat(component): add new feature"
```

### Pushing a Branch

```bash
git push -u origin feature/my-feature
```

### Updating a Branch with Latest Changes from Develop

```bash
git checkout develop
git pull
git checkout feature/my-feature
git merge develop
# Resolve any conflicts
git push
```

### Creating a Release

```bash
git checkout develop
git pull
git checkout -b release/1.2.0
# Make version bump changes
git add .
git commit -m "chore(release): bump version to 1.2.0"
git push -u origin release/1.2.0
```

### Creating a Hotfix

```bash
git checkout main
git pull
git checkout -b hotfix/critical-issue
# Fix the issue
git add .
git commit -m "fix(component): fix critical issue"
git push -u origin hotfix/critical-issue
```
