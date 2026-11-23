[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Repository,
    [Parameter(Mandatory)][string]$Content
)

$ErrorActionPreference = 'Stop'
$git = (Get-Command git.exe -CommandType Application | Select-Object -First 1).Source
$contentLine = ($Content -replace '\s+', ' ').Trim()
if (!$contentLine) { throw 'Enter the news text.' }

function Invoke-NewsGit {
    param([string]$Directory, [string]$Step, [string[]]$Arguments)

    # Git writes progress to stderr even on success.
    $ErrorActionPreference = 'Continue'
    $output = & $git -C $Directory @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        $details = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
        throw "$Step failed.`r`n`r`n$details"
    }
    $output | ForEach-Object { $_.ToString() }
}

$trackingRef = 'refs/remotes/origin/main'
$branchRef = 'refs/heads/main'
$tempRoot = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).Path
$worktree = Join-Path $tempRoot ('homepage-news-' + [guid]::NewGuid().ToString('N'))
$worktreeCreated = $false

try {
    $null = Invoke-NewsGit $Repository 'Git fetch' @('fetch', '--no-tags', 'origin', "+${branchRef}:${trackingRef}")
    $null = Invoke-NewsGit $Repository 'Creating the publishing worktree' @('worktree', 'add', '--detach', $worktree, $trackingRef)
    $worktreeCreated = $true

    $newsFile = Join-Path $worktree 'news.json'
    $source = [IO.File]::ReadAllText($newsFile)
    if (!$source.TrimStart().StartsWith('[')) { throw 'news.json must contain a JSON array.' }
    $history = @(ConvertFrom-Json -InputObject $source -ErrorAction Stop)
    # Windows PowerShell returns the parsed array as a single pipeline item.
    if ($history.Count -eq 1 -and $history[0] -is [array]) { $history = $history[0] }

    if ($history.Count -eq 0 -or $history[0].content -cne $contentLine) {
        $updated = @(@{ content = $contentLine }) + $history
        $json = ConvertTo-Json -InputObject $updated -Depth 10
        [IO.File]::WriteAllText($newsFile, $json + "`n", [Text.UTF8Encoding]::new($false))
        $null = Invoke-NewsGit $worktree 'Staging the news' @('add', '--', 'news.json')
        $null = Invoke-NewsGit $worktree 'Committing the news' @('commit', '-m', 'Publish homepage news')
    }

    $publishedCommit = Invoke-NewsGit $worktree 'Reading the news commit' @('rev-parse', 'HEAD')
    $null = Invoke-NewsGit $worktree 'Git push' @('push', 'origin', "HEAD:${branchRef}")

    $localUpdated = $false
    try {
        $currentBranch = Invoke-NewsGit $Repository 'Checking the local branch' @('branch', '--show-current')
        $changes = Invoke-NewsGit $Repository 'Checking the local checkout' @('status', '--porcelain')
        if ($currentBranch -eq 'main' -and !$changes) {
            $null = Invoke-NewsGit $Repository 'Updating local main' @('merge', '--ff-only', $publishedCommit)
            $localUpdated = $true
        }
    } catch {
        Write-Verbose $_.Exception.Message
    }
    [pscustomobject]@{ LocalUpdated = $localUpdated }
} finally {
    if ($worktreeCreated) {
        try {
            $resolvedWorktree = (Resolve-Path -LiteralPath $worktree).Path
            if ([IO.Path]::GetDirectoryName($resolvedWorktree) -eq $tempRoot.TrimEnd('\', '/')) {
                $null = Invoke-NewsGit $Repository 'Removing the publishing worktree' @('worktree', 'remove', '--force', $resolvedWorktree)
            }
        } catch {
            Write-Verbose $_.Exception.Message
        }
    }
}
