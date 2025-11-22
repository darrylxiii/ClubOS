# Deployment Guide

## Environments

### Development
- **URL:** http://localhost:8080
- **Database:** Local Supabase instance
- **Purpose:** Local development and testing

### Staging
- **URL:** https://staging.thequantumclub.com
- **Database:** Staging Supabase project
- **Purpose:** Pre-production testing

### Production
- **URL:** https://thequantumclub.com
- **Database:** Production Supabase project
- **Purpose:** Live application

## Deployment Process

### Automated Deployment (CI/CD)

1. **Push to branch:**
```bash
git push origin feature/your-feature
```

2. **Create pull request:**
- Tests run automatically
- Review required from maintainers
- Merge to main after approval

3. **Auto-deploy:**
- Merge to `main` deploys to staging
- Tag release deploys to production

### Manual Deployment

**Build for production:**
```bash
npm run build
```

**Deploy to Lovable Cloud:**
```bash
# Deployment handled automatically by Lovable
```

## Database Migrations

**Run pending migrations:**
```bash
npx supabase db push
```

**Create new migration:**
```bash
npx supabase migration new migration_name
```

**Rollback migration:**
```bash
npx supabase db reset
```

## Environment Variables

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

**Never commit `.env` files!**

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Performance metrics reviewed
- [ ] Security scan completed
- [ ] Changelog updated
- [ ] Documentation updated

## Post-Deployment

1. **Monitor logs** for errors
2. **Check System Health Dashboard**
3. **Verify critical paths** work
4. **Monitor performance metrics**
5. **Watch for user reports**

## Rollback Procedure

If deployment fails:

1. **Tag previous version:**
```bash
git tag -a rollback-$(date +%Y%m%d) -m "Rollback"
```

2. **Revert database migrations:**
```bash
npx supabase db reset --to <previous_migration>
```

3. **Notify team** of rollback

4. **Document incident**

## Troubleshooting

**Build fails:**
- Check TypeScript errors
- Verify all dependencies installed
- Clear cache: `rm -rf node_modules .next`

**Database connection fails:**
- Verify environment variables
- Check Supabase project status
- Review RLS policies

**Deploy fails:**
- Check deployment logs
- Verify GitHub Actions status
- Contact Lovable support

## Support

For deployment issues:
- Check logs in System Health Dashboard
- Review error logs in database
- Contact: support@thequantumclub.com
