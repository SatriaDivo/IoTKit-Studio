# Contributing to IoTKit-Studio

Terima kasih atas minat Anda untuk berkontribusi pada IoTKit-Studio! 🎉

## 🤝 How to Contribute

### Reporting Bugs

Jika Anda menemukan bug:

1. Check apakah bug sudah dilaporkan di Issues
2. Jika belum, buat Issue baru dengan:
   - Deskripsi jelas tentang bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (jika ada)
   - Environment (OS, Node version, browser)

### Suggesting Features

Untuk request fitur baru:

1. Check apakah fitur sudah ada di Issues atau Roadmap
2. Buat Issue baru dengan label "enhancement"
3. Jelaskan:
   - Use case
   - Benefit untuk users
   - Possible implementation

### Pull Requests

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 Development Guidelines

### Code Style

**TypeScript:**

- Use TypeScript strict mode
- Define proper types/interfaces
- Avoid `any` type when possible
- Use meaningful variable names

**React/Next.js:**

- Use functional components
- Use hooks properly
- Keep components small and focused
- Use proper prop types

**Backend:**

- Follow REST API conventions
- Use proper HTTP status codes
- Handle errors properly
- Add input validation

### Commit Messages

Format:

```
type(scope): subject

body (optional)
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:

```
feat(frontend): add payload builder component
fix(backend): resolve MQTT connection issue
docs(readme): update installation guide
```

### Testing

Before submitting PR:

1. Test your changes locally
2. Ensure no console errors
3. Test on different browsers (if frontend)
4. Test API endpoints (if backend)

### Documentation

Update documentation if you:

- Add new features
- Change API endpoints
- Modify configuration
- Update dependencies

## 🏗️ Project Structure

### Frontend

```
frontend/src/
├── app/              # Next.js pages
├── components/       # React components
├── lib/              # Utilities
├── store/            # State management
├── types/            # TypeScript types
└── services/         # API services
```

### Backend

```
backend/src/
├── routes/           # API routes
├── controllers/      # Controllers
├── services/         # Business logic
├── protocols/        # Protocol clients
├── simulation/       # Simulation engine
├── middleware/       # Middleware
├── utils/            # Utilities
└── types/            # TypeScript types
```

## 🔍 Code Review Process

1. Maintainer akan review PR Anda
2. Mungkin ada request untuk changes
3. Setelah approved, PR akan di-merge
4. Your contribution akan masuk ke next release!

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Every contribution helps make IoTKit-Studio better!
