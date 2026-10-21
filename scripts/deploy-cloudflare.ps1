param(
    [switch]$ConfirmFreePlan,
    [switch]$ConfirmAccount,
    [string]$ProjectName
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repositoryRoot 'frontend'
$databaseName = 'lael-nexus-store'
$defaultProjectName = 'lael-nexus'

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
    -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js and npm are required. Install the current Node.js LTS release first.'
}

Push-Location $frontendPath
try {
    if (-not (Test-Path -LiteralPath 'node_modules\wrangler\bin\wrangler.js')) {
        npm ci
        if ($LASTEXITCODE -ne 0) {
            throw 'Installing the frontend and Wrangler dependencies failed.'
        }
    }

    Write-Host 'Continue only if your Cloudflare account is on Workers Free; Pages and D1 have free usage limits.'
    Write-Host 'Do not upgrade to a paid Workers plan if you do not want charges.'
    Write-Host 'Customer order details and plan requests will be stored in your Cloudflare D1 database; this demo does not send email or accept payments.'
    if (-not $ConfirmFreePlan) {
        $freePlanConfirmation = Read-Host 'Confirm your account uses Workers Free. Type FREE to continue'
        if ($freePlanConfirmation -cne 'FREE') {
            Write-Host 'Deployment cancelled. No Cloudflare resources were created.'
            return
        }
    }

    $identityOutput = & npx wrangler whoami 2>&1
    $identityExitCode = $LASTEXITCODE
    $identityText = $identityOutput -join ' '
    if ($identityExitCode -ne 0 -or $identityText -match 'not authenticated') {
        Write-Host 'Wrangler needs an interactive Cloudflare sign-in; the browser will open.'
        npx wrangler login
        if ($LASTEXITCODE -ne 0) {
            throw 'Cloudflare sign-in failed. Run this script from an interactive PowerShell terminal. Do not share API tokens or passwords.'
        }
        $identityOutput = & npx wrangler whoami 2>&1
        $identityExitCode = $LASTEXITCODE
        $identityText = $identityOutput -join ' '
        if ($identityExitCode -ne 0 -or $identityText -match 'not authenticated') {
            throw 'Could not verify Cloudflare sign-in after login.'
        }
    }
    Write-Host 'Cloudflare account authentication verified.'
    if (-not $ConfirmAccount) {
        $accountConfirmation = Read-Host 'Confirm this is your Cloudflare account by typing DEPLOY'
        if ($accountConfirmation -cne 'DEPLOY') {
            Write-Host 'Account was not confirmed. No Cloudflare resources were created.'
            return
        }
    }

    if ([string]::IsNullOrWhiteSpace($projectName)) {
        $projectName = Read-Host "Cloudflare Pages project name [$defaultProjectName]"
        if ([string]::IsNullOrWhiteSpace($projectName)) {
            $projectName = $defaultProjectName
        }
    }
    if ($projectName -notmatch '^[a-z0-9][a-z0-9-]{1,56}[a-z0-9]$') {
        throw 'Use a project name of 3-58 lowercase letters, numbers, or hyphens; it cannot start or end with a hyphen.'
    }

    $databaseOutput = & npx wrangler d1 list --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Could not list D1 databases: $($databaseOutput -join ' ')"
    }
    try {
        $databases = ($databaseOutput -join [Environment]::NewLine) | ConvertFrom-Json
    }
    catch {
        throw 'Could not read the Cloudflare D1 database list.'
    }
    if ($databases.result) {
        $databases = $databases.result
    }

    $database = @($databases) | Where-Object { $_.name -eq $databaseName } | Select-Object -First 1
    $databaseId = $null
    if ($database) {
        $databaseId = $database.uuid
        if (-not $databaseId) {
            $databaseId = $database.database_id
        }
    }

    if (-not $databaseId) {
        $createOutput = & npx wrangler d1 create $databaseName --location enam 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Could not create the free-tier D1 database: $($createOutput -join ' ')"
        }
        $createText = $createOutput -join [Environment]::NewLine
        $idMatch = [regex]::Match($createText, 'database_id\s*=\s*"([0-9a-fA-F-]{36})"')
        if ($idMatch.Success) {
            $databaseId = $idMatch.Groups[1].Value
        }
        else {
            $databaseOutput = & npx wrangler d1 list --json 2>&1
            if ($LASTEXITCODE -eq 0) {
                try {
                    $databases = ($databaseOutput -join [Environment]::NewLine) | ConvertFrom-Json
                    if ($databases.result) {
                        $databases = $databases.result
                    }
                    $database = @($databases) | Where-Object { $_.name -eq $databaseName } | Select-Object -First 1
                    if ($database) {
                        $databaseId = $database.uuid
                        if (-not $databaseId) {
                            $databaseId = $database.database_id
                        }
                    }
                }
                catch {
                    $databaseId = $null
                }
            }
        }
        if (-not $databaseId) {
            throw "D1 database was created, but its ID could not be read. Run 'npx wrangler d1 list --json' in frontend, then rerun this script."
        }
    }

    $templatePath = Join-Path $frontendPath 'wrangler.toml.template'
    $configPath = Join-Path $frontendPath 'wrangler.toml'
    $config = (Get-Content -LiteralPath $templatePath -Raw).Replace('__D1_DATABASE_ID__', $databaseId)
    Set-Content -LiteralPath $configPath -Value $config -Encoding utf8

    $projectOutput = & npx wrangler pages project list --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Could not list Pages projects: $($projectOutput -join ' ')"
    }
    try {
        $projects = ($projectOutput -join [Environment]::NewLine) | ConvertFrom-Json
    }
    catch {
        throw 'Could not read the Cloudflare Pages project list.'
    }
    if ($projects.result) {
        $projects = $projects.result
    }

    $project = @($projects) | Where-Object { $_.name -eq $projectName } | Select-Object -First 1
    if (-not $project) {
        npx wrangler pages project create $projectName --production-branch master
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not create the Pages project. If the name is unavailable, rerun and choose another project name.'
        }
    }

    npx wrangler d1 migrations apply $databaseName --remote
    if ($LASTEXITCODE -ne 0) {
        throw 'Applying the D1 schema failed. Fix the reported migration issue before deploying the site.'
    }

    npm run build:pages
    if ($LASTEXITCODE -ne 0) {
        throw 'Building the public storefront failed.'
    }

    npx wrangler pages deploy dist --project-name $projectName --branch master
    if ($LASTEXITCODE -ne 0) {
        throw 'Cloudflare Pages deployment failed.'
    }

    Write-Host ''
    Write-Host 'Deployment finished.'
    Write-Host "Store: https://$projectName.pages.dev/tienda"
    Write-Host "Software plans: https://$projectName.pages.dev/software"
    Write-Host 'The static public build does not include the admin dashboard.'
}
finally {
    Pop-Location
}
