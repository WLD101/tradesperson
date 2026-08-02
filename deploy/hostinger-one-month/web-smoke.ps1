param(
  [string]$WebUrl = "https://tradesperson.net"
)

$ErrorActionPreference = "Stop"

$paths = @(
  "/",
  "/sign-in",
  "/website",
  "/website/onboarding"
)

foreach ($path in $paths) {
  $url = "$WebUrl$path"
  $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 20
  [pscustomobject]@{
    Url = $url
    StatusCode = [int]$response.StatusCode
  }
}
