param(
  [string]$ApiUrl = "https://api.tradesperson.net"
)

$ErrorActionPreference = "Stop"

function Invoke-Health {
  param([string]$Path)
  $url = "$ApiUrl$Path"
  $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 20
  [pscustomobject]@{
    Url = $url
    StatusCode = [int]$response.StatusCode
  }
}

Invoke-Health "/api/v1/health"
Invoke-Health "/api/v1/ready"
