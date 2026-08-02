param(
  [string]$ApiUrl = "https://api.tradesperson.net"
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
  param([string]$Url)
  $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 20
  [pscustomobject]@{
    Url = $Url
    StatusCode = [int]$response.StatusCode
  }
}

Test-Endpoint "$ApiUrl/api/v1/health"
Test-Endpoint "$ApiUrl/api/v1/ready"
