# Contributing to NectoProxy

Thank you for your interest in contributing to NectoProxy! This project is maintained by [Sitharaj Seenivasan](https://sitharaj.in) and welcomes contributions from the community.

## Ways to Contribute

There are many ways to contribute, regardless of your experience level:

### Report Bugs

Found a bug? Open an issue on [GitHub Issues](https://github.com/sitharaj88/nectoproxy/issues) with:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs. actual behavior
- Your environment (OS, Node.js version, NectoProxy version, browser)
- Screenshots or terminal output if applicable

::: tip
Search existing issues before opening a new one. Someone may have already reported the same bug, and your additional information can help resolve it faster.
:::

### Suggest Features

Have an idea for a new feature? Open a feature request issue on [GitHub Issues](https://github.com/sitharaj88/nectoproxy/issues) with:

- A clear description of the feature
- The problem it solves or the use case it enables
- Any examples of similar features in other tools
- Whether you are willing to work on implementing it

### Contribute Code

Code contributions are welcome via pull requests. See the [Development Setup](./development-setup) page for instructions on building the project locally.

### Improve Documentation

Documentation improvements are always appreciated. The documentation site lives in the `docs-site/` directory and uses VitePress. You can:

- Fix typos and unclear explanations
- Add missing information
- Improve examples
- Translate documentation

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. When contributing, please:

- **Be respectful.** Treat everyone with dignity and respect.
- **Be constructive.** Focus on the idea, not the person. Offer solutions, not just criticism.
- **Be patient.** Maintainers and other contributors are volunteers. Response times may vary.
- **Be inclusive.** Welcome newcomers and help them get started.
- **Be professional.** Avoid offensive language, personal attacks, and harassment of any kind.

## Submitting Issues

### Bug Report Template

When reporting bugs, please include:

```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Start NectoProxy with `nectoproxy start`
2. Go to '...'
3. Click on '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened. Include error messages.

**Environment**
- OS: macOS 14.2 / Ubuntu 24.04 / Windows 11
- Node.js: v20.11.0
- NectoProxy: v0.1.0
- Browser: Chrome 120

**Screenshots**
If applicable, add screenshots.
```

## Pull Request Process

### 1. Fork the Repository

Fork [sitharaj88/nectoproxy](https://github.com/sitharaj88/nectoproxy) on GitHub.

### 2. Create a Branch

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/nectoproxy.git
cd nectoproxy

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

Follow the project's coding standards (see below). Make focused, incremental changes. Each pull request should address a single concern.

### 4. Write Tests

If your change modifies behavior, add or update tests to cover the new functionality.

```bash
# Run tests
pnpm test
```

### 5. Build Successfully

Ensure the full project builds without errors:

```bash
pnpm build
```

### 6. Submit the Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name
```

Then open a pull request on GitHub with:

- A clear title describing the change
- A description explaining what the PR does and why
- Reference to any related issues (e.g., "Fixes #42")
- Screenshots for UI changes

### 7. Code Review

A maintainer will review your pull request. Be responsive to feedback and willing to make changes. All discussions should be constructive and respectful.

## Coding Standards

### General

- Use **TypeScript** for all source code
- Follow the existing code style in the project
- Use meaningful variable and function names
- Write comments for complex logic, but prefer self-documenting code
- Keep functions small and focused

### Formatting

The project uses consistent formatting. Before submitting:

```bash
# Run linting
pnpm lint
```

### Commit Messages

Write clear, descriptive commit messages:

- Use the imperative mood ("Add feature" not "Added feature")
- Keep the first line under 72 characters
- Reference issue numbers when applicable

Good examples:
```
feat: add SSL passthrough wildcard matching
fix: resolve EADDRINUSE crash on port conflict
docs: update certificate installation instructions
refactor: extract ThrottleService from ProxyServer
test: add unit tests for RuleMatcher
```

### Project Architecture

Before contributing code, familiarize yourself with the [Architecture](./architecture) documentation to understand how the packages interact.

## License

By contributing to NectoProxy, you agree that your contributions will be licensed under the [MIT License](https://github.com/sitharaj88/nectoproxy/blob/main/LICENSE).

## Getting Help

If you need help with your contribution:

- Open a [discussion](https://github.com/sitharaj88/nectoproxy/issues) on GitHub.
- Ask questions in your pull request.
- Reach out to the maintainer, [Sitharaj Seenivasan](https://sitharaj.in).

We appreciate every contribution, no matter how small. Thank you for helping make NectoProxy better!
