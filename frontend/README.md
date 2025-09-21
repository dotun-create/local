# TroupeDev Frontend

A modern, scalable React application for the TroupeDev educational platform, built with feature-based architecture and comprehensive performance optimization.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Analyze bundle size
npm run analyze
```

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### Core Features
- **Multi-role Authentication**: Student, Tutor, Admin, and Guardian roles
- **Course Management**: Create, manage, and deliver educational content
- **Session Scheduling**: Real-time calendar integration
- **Payment Processing**: Secure payment handling with Stripe
- **Real-time Chat**: WebSocket-based messaging system
- **Analytics Dashboard**: Performance metrics and insights

### Technical Features
- **Feature-based Architecture**: Scalable code organization
- **Design System**: Consistent UI with design tokens
- **Performance Optimized**: Lazy loading, code splitting, bundle optimization
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark/Light Mode**: Theme switching with system preference detection
- **Responsive Design**: Mobile-first responsive layout
- **PWA Ready**: Service worker and offline capabilities

## 🏗️ Architecture

The application follows a feature-based architecture pattern:

```
src/
├── features/           # Business features
│   ├── auth/          # Authentication
│   ├── dashboard/     # User dashboards
│   ├── courses/       # Course management
│   ├── calendar/      # Scheduling
│   └── payments/      # Payment processing
├── shared/            # Shared resources
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and business logic
│   ├── utils/         # Utility functions
│   └── styles/        # Design system
└── __tests__/         # Integration tests
```

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Development

### Prerequisites

- Node.js 16+
- npm 8+
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm test` | Run test suite |
| `npm run build` | Build for production |
| `npm run analyze` | Analyze bundle size |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run type-check` | Run TypeScript checks |

### Development Tools

- **Hot Reloading**: Instant updates during development
- **Error Boundaries**: Graceful error handling
- **Performance Dashboard**: Real-time performance monitoring
- **Bundle Analyzer**: Webpack bundle analysis
- **Testing Utilities**: Custom testing helpers

### Code Style

The project uses ESLint and Prettier for code consistency:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Fix lint issues
npm run lint:fix
```

## 🧪 Testing

### Testing Strategy

The application includes comprehensive testing at multiple levels:

1. **Unit Tests**: Component and utility testing
2. **Integration Tests**: Feature interaction testing
3. **User Journey Tests**: End-to-end workflow testing
4. **Performance Tests**: Performance benchmarking

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Button.test.jsx

# Run tests for specific feature
npm test -- features/auth
```

### Testing Utilities

Custom testing utilities provide consistent setup:

```javascript
import { renderWithProviders } from '@shared/testing/test-utils';

test('should render button correctly', () => {
  renderWithProviders(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

### Writing Tests

Follow these guidelines when writing tests:

1. **Test user behavior**, not implementation details
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Include accessibility tests**
4. **Test error states and edge cases**
5. **Keep tests focused and descriptive**

Example test structure:

```javascript
describe('LoginForm', () => {
  it('should validate required fields', async () => {
    renderWithProviders(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});
```

## ⚡ Performance

### Performance Features

- **Code Splitting**: Route and component-level splitting
- **Lazy Loading**: Dynamic imports for heavy components
- **Bundle Optimization**: Webpack optimizations and tree shaking
- **Image Optimization**: WebP support and lazy loading
- **Caching**: Service worker and HTTP caching
- **Core Web Vitals**: Real-time monitoring

### Performance Monitoring

The application includes a built-in performance dashboard accessible at `/performance` in development mode.

Key metrics tracked:
- **LCP (Largest Contentful Paint)**: Loading performance
- **FID (First Input Delay)**: Interactivity
- **CLS (Cumulative Layout Shift)**: Visual stability
- **Bundle Sizes**: JavaScript bundle analysis
- **Memory Usage**: Runtime memory consumption

### Performance Budget

| Resource | Budget | Current |
|----------|---------|---------|
| Main Bundle | 250KB | ✅ |
| Vendor Bundle | 500KB | ✅ |
| Total Bundle | 1MB | ✅ |
| LCP | < 2.5s | ✅ |
| FID | < 100ms | ✅ |

### Optimization Tips

1. **Use React.memo** for expensive components
2. **Implement virtualization** for large lists
3. **Optimize images** and use appropriate formats
4. **Lazy load** non-critical features
5. **Monitor bundle sizes** regularly

## 🚀 Deployment

### Build Process

```bash
# Production build
npm run build

# Analyze build
npm run analyze
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_URL` | Backend API URL | Yes |
| `REACT_APP_STRIPE_KEY` | Stripe publishable key | Yes |
| `REACT_APP_WEBSOCKET_URL` | WebSocket server URL | Yes |
| `REACT_APP_ENVIRONMENT` | Environment name | No |

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Build artifacts generated
- [ ] Performance budget validated
- [ ] Security headers configured
- [ ] CDN and caching configured
- [ ] Error monitoring enabled
- [ ] Analytics configured

### CI/CD Pipeline

The project includes automated CI/CD with:

1. **Code Quality Checks**: ESLint, Prettier, TypeScript
2. **Test Execution**: Unit, integration, and E2E tests
3. **Performance Testing**: Bundle size and Core Web Vitals
4. **Security Scanning**: Dependency vulnerability checks
5. **Automated Deployment**: Staging and production deployment

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write tests for new features and bug fixes
- Update documentation for architectural changes
- Use semantic commit messages
- Ensure accessibility standards are met

### Code Review Process

All changes require:
1. ✅ Automated tests passing
2. ✅ Code review approval
3. ✅ Performance budget compliance
4. ✅ Accessibility validation

### Commit Message Format

Use conventional commits:

```
feat: add user profile management
fix: resolve authentication redirect issue
docs: update API documentation
test: add integration tests for payment flow
perf: optimize bundle splitting strategy
```

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Migration Guide](./MIGRATION.md)
- [Component Storybook](./storybook)
- [API Documentation](./docs/api.md)
- [Performance Guide](./docs/performance.md)

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (16+)
   - Clear node_modules and reinstall
   - Verify environment variables

2. **Tests Fail**
   - Update test snapshots if needed
   - Check for async issues in tests
   - Verify test environment setup

3. **Performance Issues**
   - Use the performance dashboard
   - Check bundle analysis
   - Monitor Core Web Vitals

### Getting Help

- Check existing [Issues](./issues)
- Review [Discussions](./discussions)
- Consult [Documentation](./docs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

**Built with ❤️ by the TroupeDev Team**