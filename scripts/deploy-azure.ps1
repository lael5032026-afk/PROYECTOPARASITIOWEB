$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $repositoryRoot 'infra\azure\main.bicep'
$location = Read-Host 'Azure region [eastus2]'
if ([string]::IsNullOrWhiteSpace($location)) {
    $location = 'eastus2'
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI is required. Install it from https://learn.microsoft.com/cli/azure/install-azure-cli and run this script again.'
}

$accountCheck = $null
try {
    $accountCheck = az account show --output json 2>$null
}
catch {
    $accountCheck = $null
}
if ($LASTEXITCODE -ne 0 -or -not $accountCheck) {
    az login --output none
    if ($LASTEXITCODE -ne 0) {
        throw 'Azure sign-in failed.'
    }
}

$subscription = az account show --query '{name:name,id:id}' --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $subscription.id) {
    throw 'Could not read the active Azure subscription.'
}

Write-Host "Subscription: $($subscription.name) ($($subscription.id))"
$subscriptionConfirmation = Read-Host 'Type the subscription ID above to confirm this is the Azure account you intend to use'
if ($subscriptionConfirmation -cne $subscription.id) {
    Write-Host 'Subscription was not confirmed. No Azure resources were created.'
    return
}

Write-Host 'This setup creates Azure Container Apps, a container registry, logging, and an Azure SQL Basic database.'
Write-Host 'Azure bills for these resources. Review current regional pricing before continuing.'
$costApproval = Read-Host 'Continue and create billable Azure resources? Type YES'
if ($costApproval -cne 'YES') {
    Write-Host 'No Azure resources were created.'
    return
}

$password = Read-Host 'Create an Azure SQL administrator password and save it in a password manager' -AsSecureString
$confirmPassword = Read-Host 'Enter the same password again' -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$confirmPasswordText = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPassword)

try {
    $sqlPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordText)
    $sqlPasswordConfirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPasswordText)
    if ($sqlPassword -cne $sqlPasswordConfirmation) {
        throw 'The SQL administrator passwords do not match.'
    }
    if ($sqlPassword.Length -lt 16 -or
        $sqlPassword -notmatch '[A-Z]' -or
        $sqlPassword -notmatch '[a-z]' -or
        $sqlPassword -notmatch '[0-9]' -or
        $sqlPassword -notmatch '[^a-zA-Z0-9]') {
        throw 'Use at least 16 characters, including uppercase, lowercase, a number, and a symbol.'
    }

    $suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $resourceGroup = "lael-nexus-$suffix"
    Write-Host "Resources will be isolated in resource group: $resourceGroup"
    $parameterFile = Join-Path ([System.IO.Path]::GetTempPath()) "lael-azure-$suffix.parameters.json"
    $parameterContent = @{
        '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
        contentVersion = '1.0.0.0'
        parameters = @{
            suffix = @{ value = $suffix }
            sqlAdminPassword = @{ value = $sqlPassword }
        }
    } | ConvertTo-Json -Depth 6
    Set-Content -LiteralPath $parameterFile -Value $parameterContent -Encoding utf8

    try {
        Push-Location $repositoryRoot
        try {
            az group create --name $resourceGroup --location $location --output none
            if ($LASTEXITCODE -ne 0) {
                throw 'Could not create the Azure resource group.'
            }

            $deploymentJson = az deployment group create `
                --resource-group $resourceGroup `
                --name "lael-nexus-$suffix" `
                --template-file $templatePath `
                --parameters "@$parameterFile" `
                --output json
            if ($LASTEXITCODE -ne 0) {
                throw 'Azure infrastructure deployment failed. Review the Azure deployment error before retrying.'
            }
            $deployment = $deploymentJson | ConvertFrom-Json
            $outputs = $deployment.properties.outputs
            $registryName = $outputs.registryName.value
            $registryServer = $outputs.registryServer.value
            $identityId = $outputs.registryPullIdentity.value
            $environmentName = $outputs.containerEnvironmentName.value
            $sqlServerName = $outputs.sqlServerName.value
            $sqlServerFqdn = $outputs.sqlServerFqdn.value
            $sqlUsername = $outputs.sqlAdminUsername.value

            $outboundIpsJson = az containerapp env show `
                --resource-group $resourceGroup `
                --name $environmentName `
                --query properties.outboundIpAddresses `
                --output json
            if ($LASTEXITCODE -ne 0) {
                throw 'Could not get the Container Apps outbound IP addresses for the database firewall.'
            }
            $outboundIps = $outboundIpsJson | ConvertFrom-Json
            if (-not $outboundIps -or $outboundIps.Count -gt 250) {
                throw 'The Container Apps outbound IP list is empty or exceeds the supported SQL firewall rule count.'
            }

            $index = 0
            foreach ($ip in $outboundIps) {
                $index++
                az sql server firewall-rule create `
                    --resource-group $resourceGroup `
                    --server $sqlServerName `
                    --name ('aca-egress-{0:D3}' -f $index) `
                    --start-ip-address $ip `
                    --end-ip-address $ip `
                    --output none
                if ($LASTEXITCODE -ne 0) {
                    throw 'Could not restrict the Azure SQL firewall to the application outbound addresses.'
                }
            }

            az acr build `
                --registry $registryName `
                --image 'lael-nexus-api:latest' `
                --file Dockerfile `
                (Join-Path $repositoryRoot 'backend\LaelNexus.Api')
            if ($LASTEXITCODE -ne 0) {
                throw 'Building the API container image failed.'
            }

            az acr build `
                --registry $registryName `
                --image 'lael-nexus-frontend:latest' `
                --build-arg 'PUBLIC_STORE_ONLY=true' `
                --file Dockerfile `
                (Join-Path $repositoryRoot 'frontend')
            if ($LASTEXITCODE -ne 0) {
                throw 'Building the public frontend container image failed.'
            }

            Write-Host 'Waiting for the registry pull permission to propagate...'
            Start-Sleep -Seconds 30

            $connectionString = "Server=tcp:$sqlServerFqdn,1433;Initial Catalog=LaelNexus;Persist Security Info=False;User ID=$sqlUsername;Password=$sqlPassword;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
            az containerapp create `
                --resource-group $resourceGroup `
                --name "lael-nexus-api-$suffix" `
                --environment $environmentName `
                --image "$registryServer/lael-nexus-api:latest" `
                --registry-server $registryServer `
                --registry-identity $identityId `
                --user-assigned $identityId `
                --ingress internal `
                --target-port 8080 `
                --transport http `
                --min-replicas 0 `
                --max-replicas 1 `
                --secrets "sql-connection=$connectionString" `
                --env-vars 'ASPNETCORE_ENVIRONMENT=Production' 'ASPNETCORE_URLS=http://+:8080' 'ConnectionStrings__LaelNexus=secretref:sql-connection' `
                --output none
            if ($LASTEXITCODE -ne 0) {
                throw 'Creating the private API container app failed.'
            }

            $apiHost = az containerapp show `
                --resource-group $resourceGroup `
                --name "lael-nexus-api-$suffix" `
                --query properties.configuration.ingress.fqdn `
                --output tsv
            if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiHost)) {
                throw 'Could not resolve the private API hostname.'
            }

            az containerapp create `
                --resource-group $resourceGroup `
                --name "lael-nexus-web-$suffix" `
                --environment $environmentName `
                --image "$registryServer/lael-nexus-frontend:latest" `
                --registry-server $registryServer `
                --registry-identity $identityId `
                --user-assigned $identityId `
                --ingress external `
                --target-port 80 `
                --transport http `
                --min-replicas 0 `
                --max-replicas 3 `
                --env-vars "API_HOST=$apiHost" `
                --output none
            if ($LASTEXITCODE -ne 0) {
                throw 'Creating the public storefront container app failed.'
            }

            $publicHost = az containerapp show `
                --resource-group $resourceGroup `
                --name "lael-nexus-web-$suffix" `
                --query properties.configuration.ingress.fqdn `
                --output tsv
            if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($publicHost)) {
                throw 'Could not resolve the public storefront URL.'
            }

            $deploymentInfo = @{
                resourceGroup = $resourceGroup
                location = $location
                sqlServer = $sqlServerName
                apiApp = "lael-nexus-api-$suffix"
                frontendApp = "lael-nexus-web-$suffix"
                publicUrl = "https://$publicHost/tienda"
                softwarePlansUrl = "https://$publicHost/software"
            } | ConvertTo-Json
            $deploymentInfoPath = Join-Path $repositoryRoot '.azure\deployment.json'
            New-Item -ItemType Directory -Path (Split-Path -Parent $deploymentInfoPath) -Force | Out-Null
            Set-Content -LiteralPath $deploymentInfoPath -Value $deploymentInfo -Encoding utf8

            Write-Host ''
            Write-Host 'Deployment complete.'
            Write-Host "Store: https://$publicHost/tienda"
            Write-Host "Software plans: https://$publicHost/software"
            Write-Host 'Only the public catalog and store request endpoints are exposed through the website.'
            Write-Host 'The admin dashboard and inventory/CRM write APIs are not publicly proxied.'
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Remove-Item -LiteralPath $parameterFile -Force -ErrorAction SilentlyContinue
        $sqlPassword = $null
        $sqlPasswordConfirmation = $null
        $connectionString = $null
        $parameterContent = $null
        $deploymentJson = $null
        $deployment = $null
        $outputs = $null
    }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordText)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPasswordText)
}
