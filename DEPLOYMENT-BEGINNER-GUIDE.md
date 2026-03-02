# Deployment Beginner Guide (Dev-First, AWS + GitHub Actions)

This guide is written for first-time AWS users.

## 1) What "start with a safe path" means

A safe path means:

1. Deploy only `dev` first.
2. Do not configure or run `prod` yet.
3. Validate the full flow in a test environment before exposing real users.
4. Keep costs low and mistakes reversible.

## 2) Use only `dev` first (important)

Your current workflow has both `deploy-dev` and `deploy-prod` jobs.

For beginners, do this:

1. Set up only `dev` GitHub environment and secrets.
2. Temporarily disable `deploy-prod` job, or guard it with a variable.

Recommended guard in `.github/workflows/deploy.yml`:

```yaml
deploy-prod:
  if: ${{ vars.ENABLE_PROD_DEPLOY == 'true' }}
```

Then in GitHub repo variables:

- `ENABLE_PROD_DEPLOY=false`

This keeps your pipeline safe while learning.

Also applied in this repo workflow:

- [deploy.yml](/Users/leoworley/dev/voting-game/.github/workflows/deploy.yml)
- `deploy-prod` now runs only if `ENABLE_PROD_DEPLOY == true`.

## 3) AWS base resources to create (in order)

Use one AWS region everywhere (example: `us-east-1`).

### Step A — Create two ECR repositories

AWS Console:

1. Open **ECR**.
2. Click **Create repository**.
3. Create:
   - `voting-game-frontend`
   - `voting-game-backend`

### Step B — Create Secrets Manager secret for dev

1. Open **Secrets Manager**.
2. Click **Store a new secret**.
3. Choose **Other type of secret**.
4. Paste key/value pairs as JSON.
5. Secret name: `voting-game/dev/app`

Minimum keys:

- `NODE_ENV=production`
- `PORT=5050`
- `MONGODB_URI=...`
- `ALLOWED_ORIGINS=https://dev.your-domain.com`
- `ADMIN_API_KEY=...`
- `ENABLE_DEV_AUTH_FALLBACK=false`
- `CLERK_ISSUER=...`
- `CLERK_JWKS_URL=...`
- `CLERK_AUDIENCE=...`
- `CLERK_WEBHOOK_SECRET=...`
- `NEXT_PUBLIC_API_BASE_URL=https://dev.your-domain.com`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...`
- `CLERK_SECRET_KEY=...`

### Step C — Create IAM role for EC2 instance (runtime role)

1. Open **IAM > Roles > Create role**.
2. Trusted entity: **AWS service**, use case **EC2**.
3. Attach policies:
   - `AmazonEC2ContainerRegistryReadOnly`
4. Add custom inline policy for dev secret:
   - `secretsmanager:GetSecretValue` on `voting-game/dev/app` ARN
   - If custom KMS key: add `kms:Decrypt` for that key
5. Role name: `voting-game-ec2-dev-role`

Important:

- This role is for EC2 instance profile usage only.
- Do not use GitHub OIDC trust settings on this role.

### Step D — Create EC2 instance (dev host)

1. Open **EC2 > Instances > Launch instances**.
2. Name: `voting-game-dev`.
3. AMI: Amazon Linux 2023.
4. Instance type: `t3.small` (or `t3.medium`).
5. Key pair: create/select one.
6. Network security group:
   - Inbound SSH 22 from **your IP only**
   - Inbound 3000 from **your IP only** (temporary testing)
   - Inbound 5050 from **your IP only** (temporary testing)
7. Attach IAM role: `voting-game-ec2-dev-role`.
8. Launch instance.

### Step E — Prepare EC2 host

SSH into instance:

```bash
sudo yum update -y
sudo yum install -y docker jq awscli
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
```

Reconnect SSH, then:

```bash
mkdir -p /opt/voting-game
```

### Step F — Create IAM role for GitHub Actions (OIDC)

You need this so GitHub can push Docker images to ECR.

1. In IAM, create OIDC provider for `https://token.actions.githubusercontent.com` (if not already created).
2. Create role for Web identity.
3. Trust policy should restrict to your repo and branch.
4. Attach permissions allowing ECR push/pull.
5. Save role ARN.

Use this provider URL:

- `https://token.actions.githubusercontent.com`

Audience:

- `sts.amazonaws.com`

If AWS wizard asks for "GitHub organization", use your repo owner name.
For this repo example:

- Owner/organization: `LeoWorley`
- Repository: `voting-game`
- Branch: `main`

Important:

- This is a different role from the EC2 role.
- This role ARN is what you put in GitHub secret `AWS_ROLE_ARN`.

## 3.1) Two-role model (must be separate)

Create and use both roles:

1. `github-actions-voting-game-deploy`
- Trusts GitHub OIDC provider.
- Used by GitHub Actions only.
- Stored in GitHub repo secret `AWS_ROLE_ARN`.

2. `voting-game-ec2-dev-role`
- Trusts EC2 service.
- Attached to EC2 instance profile.
- Used by server to pull from ECR and read Secrets Manager.

## 4) GitHub setup (dev only)

### Repository variables

Settings > Secrets and variables > Actions > Variables:

- `AWS_REGION`
- `ECR_REPOSITORY_FRONTEND` = `voting-game-frontend`
- `ECR_REPOSITORY_BACKEND` = `voting-game-backend`
- `ENABLE_PROD_DEPLOY` = `false`

### Repository secrets

- `AWS_ROLE_ARN` (OIDC role for GitHub Actions)

### Environment `dev` secrets

Create environment `dev`, then add:

- `DEV_HOST` (EC2 public IP or DNS)
- `DEV_SSH_USER` (`ec2-user`)
- `DEV_SSH_KEY` (private key content)
- `DEV_SECRETS_ID` (`voting-game/dev/app`)

Do not configure `prod` yet.

How to set `DEV_HOST` correctly:

- Use EC2 **Public IPv4 DNS** (recommended), example:
  - `ec2-18-226-150-212.us-east-2.compute.amazonaws.com`
- Public IPv4 also works.
- Do not use private IP, instance ID, or ARN.

How to get `DEV_SSH_KEY` value:

On your local machine:

```bash
cat ~/Downloads/your-key-name.pem
```

Copy to clipboard:

```bash
pbcopy < ~/Downloads/your-key-name.pem
```

Paste full content into GitHub secret `DEV_SSH_KEY`, including:

- `-----BEGIN ... PRIVATE KEY-----`
- `-----END ... PRIVATE KEY-----`

## 5) First deployment test (dev)

1. Push to `main`.
2. In GitHub Actions, run `Deploy`.
3. Confirm it passes:
   - build-and-push
   - deploy-dev
4. On EC2:

```bash
cd /opt/voting-game
docker compose -f docker-compose.server.yml ps
```

5. Test:
   - `http://<EC2-IP>:3000`
   - `http://<EC2-IP>:5050/api/health`

If EC2 instance list is empty:

1. Check AWS region selector (top-right).
2. You might be in the wrong region.
3. Switch to the region you used to create resources.

## 6) Add HTTPS + domain (after dev works)

1. Create ACM certificate for `dev.your-domain.com`.
2. Create ALB:
   - listener 80 -> redirect to 443
   - listener 443 -> frontend target group
   - rule `/api/*` -> backend target group
3. In Route53, point `dev.your-domain.com` alias to ALB.
4. Update secret `NEXT_PUBLIC_API_BASE_URL=https://dev.your-domain.com`.
5. Redeploy.

## 7) Only then create production

When dev is stable:

1. Clone same setup for prod (new EC2, new secret, new env).
2. Create GitHub `prod` environment with required reviewers.
3. Set `ENABLE_PROD_DEPLOY=true`.
4. First prod release should be manual-approved only.

## 8) What to do next (your current state)

If you already created both IAM roles and one EC2 dev instance, continue here:

1. Confirm EC2 instance profile role is `voting-game-ec2-dev-role`.
2. SSH to EC2 and run setup commands from Step E.
3. Create/update Secrets Manager secret `voting-game/dev/app`.
4. Add GitHub repo variables/secrets and `dev` environment secrets.
5. Push `main` and run Deploy workflow.
6. Verify app + health endpoint.
