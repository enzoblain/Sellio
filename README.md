# Sellio

A desktop application for buy-resell management to track your purchases, sales, and analyze your business performance.

## Description

Sellio is a desktop application designed to streamline buy-resell activities between partners. It lets you record purchases, track resale, and automatically calculate profits and margins. An interactive dashboard provides an overview of performance with detailed statistics and charts.

## Key Features

- **Purchase Management**: Record products (name, category, purchase date, purchase price, associated fees)
- **Sales Management**: Track resales (sale date, sale price, fees)
- **Automatic Calculation**: Profit, gross and net margin per item
- **Dashboard**:
  - Monthly profits
  - Cumulative earnings
  - Number of items sold
  - Most profitable categories
  - Trend charts
- **Multi-user**: Partner account management
- **Media**: Multiple images per item
- **Database**: Secure data storage with PostgreSQL

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | SvelteKit 2 + Svelte 5 |
| **Bundler** | Vite 6 |
| **Desktop** | Tauri 2 |
| **Backend** | Rust |
| **Database** | PostgreSQL |
| **Languages** | TypeScript / Rust |

## Installation

```bash
git clone https://github.com/your-enzoblain/sellio.git
cd sellio

cd client
npm install

cd ..
```

## Configuration

### Environment Variables

Create a `.env` file `client/` based on `.env.example`:

```bash
cp .env.example .env
```

## Contributing

Contributions are welcome! To contribute:

1. **Fork** the project
2. Create a branch for your feature (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a **Pull Request**

### Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` refactoring
- `test:` adding tests
- `chore:` maintenance

## Roadmap

### v0.1.0 - MVP
- [x] Basic project structure
- [x] PostgreSql database configuration
- [ ] CRUD for items
- [ ] CRUD for purchases and sales
- [ ] Basic profit calculation

### v0.2.0 - Dashboard
- [ ] Dashboard with statistics
- [ ] Monthly profit charts
- [ ] Cumulative earnings charts
- [ ] Filters by category and period

### v0.3.0 - Multi-user
- [ ] User account management
- [ ] Profit sharing between partners
- [ ] Transaction history per user

### v0.4.0 - Export and Reports
- [ ] CSV/Excel export
- [ ] PDF report generation
- [ ] Database backup/restore

### v1.0.0 - Stable Release
- [ ] Finalized user interface
- [ ] Complete tests
- [ ] User documentation
- [ ] Builds for macOS, Windows, and Linux

### v2.0.0 - AI & Smart Insights
- [ ] Price prediction model (estimate resale value)
- [ ] Purchase recommendations (what to buy based on past performance)
- [ ] Market trend analysis
- [ ] Optimal pricing suggestions
- [ ] Category profitability predictions
- [ ] Inventory turnover optimization
- [ ] Best time to sell predictions

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
