# Database Migrations for Troupe Academy

This document explains the database migration system implemented for Troupe Academy to ensure schema consistency between local development and production environments.

## Overview

The migration system ensures that:
- Local database schema is exported before deployment
- Production database receives the correct schema structure
- Data consistency is maintained across environments
- Rollback capabilities exist for safety

## Files

### Core Migration Scripts

1. **`export_schema.py`** - Exports database schema from local environment
2. **`run_migrations.py`** - Applies migrations in production environment
3. **`prepare-deployment.sh`** - Pre-deployment preparation script

### Modified Files

1. **`start.sh`** - Updated to run migrations on container startup
2. **`deploy-lightsail.sh`** - Updated to export schema before deployment
3. **`Dockerfile.lightsail`** - Updated to include migration files in container

## Migration Process

### 1. Pre-Deployment (Local)

```bash
# Run preparation script
./prepare-deployment.sh

# This will:
# - Export your local database schema
# - Create migration files in backend/migrations/
# - Prepare everything for deployment
```

### 2. During Deployment

The deployment script automatically:
- Exports schema if not already done
- Includes migration files in Docker image
- Pushes updated containers to Lightsail

### 3. Production Startup

When containers start in production:
- Database connection is established
- Backup is created (if existing data)
- Migrations are applied
- Schema consistency is verified

## Usage

### Basic Deployment with Migrations

```bash
# Prepare deployment (exports schema)
./prepare-deployment.sh

# Deploy to Lightsail (includes migrations)
./deploy-lightsail.sh deploy
```

### Manual Schema Export

```bash
cd backend
python3 export_schema.py
```

### Manual Migration Run

```bash
cd backend
python3 run_migrations.py
```

## Migration Files

Migration files are stored in `backend/migrations/`:

- `schema_export_YYYYMMDD_HHMMSS.sql` - Timestamped schema exports
- `latest_schema.sql` - Symlink to the most recent export
- Backups are created in `/tmp/` during production migrations

## Safety Features

### 1. Automatic Backups
- Production database is backed up before migrations
- Backups are timestamped and stored temporarily
- Rollback is possible if issues occur

### 2. Non-Destructive Migrations
- Uses `IF EXISTS` clauses for safe drops
- Additive schema changes are preferred
- Existing data is preserved

### 3. Verification
- Post-migration verification checks
- Table count and structure validation
- Error reporting and logging

## Troubleshooting

### Common Issues

1. **Schema Export Fails**
   ```bash
   # Check DATABASE_URL is set
   echo $DATABASE_URL
   
   # Ensure pg_dump is available
   which pg_dump
   
   # Run manually with debug
   cd backend && python3 -c "import export_schema; export_schema.main()"
   ```

2. **Migration Fails in Production**
   - Check container logs: `./deploy-lightsail.sh logs`
   - Verify database connectivity
   - Check for permission issues

3. **Missing Tables After Migration**
   - Verify models.py is complete
   - Check migration file was included in Docker image
   - Run SQLAlchemy create_all as fallback

### Recovery

If migration fails:

1. **Restore from Backup** (if available)
   ```bash
   # Find backup file in /tmp/db_backup_*.sql
   # Restore using psql
   ```

2. **Force SQLAlchemy Migration**
   ```bash
   # Connect to production container
   # Run: python3 -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

## Best Practices

### Development

1. Always run migrations locally first
2. Test with a copy of production data
3. Export schema before any deployment
4. Keep migration files in version control

### Production

1. Schedule deployments during low-traffic periods
2. Monitor application after deployment
3. Keep database backups
4. Have rollback plan ready

## Environment Variables

Required for migrations:

```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
PASSWORD_ENCRYPTION_KEY=your-encryption-key
```

## Model Changes

When adding new models or fields:

1. Update `models.py`
2. Test locally
3. Export schema: `./prepare-deployment.sh`
4. Deploy: `./deploy-lightsail.sh update`

## Schema Versioning

The system creates timestamped schema exports:
- Each deployment gets a unique schema snapshot
- `latest_schema.sql` always points to the current version
- Historical schemas are preserved for reference

## Monitoring

After deployment, verify migration success:

```bash
# Check deployment status
./deploy-lightsail.sh status

# Check container logs
./deploy-lightsail.sh logs

# Verify database tables
# (Connect to production database and run: \dt)
```

## Support

If you encounter issues with migrations:

1. Check this documentation
2. Review container logs
3. Test migration scripts locally
4. Contact the development team with specific error messages