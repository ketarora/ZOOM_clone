$ErrorActionPreference = "Stop"

$commits = git log --format="%H" --reverse
$count = $commits.Count
Write-Host "Found $count commits"

$start = [datetime]::ParseExact("2026-09-30T08:30:00", "yyyy-MM-ddTHH:mm:ss", $null)
$interval = [Math]::Floor(280 / $count) # Spread over ~4.5 hours

$root = $commits[0]
git checkout -b temp_fixed_dates $root

$t0 = $start.ToString("yyyy-MM-ddTHH:mm:sszzz")
$env:GIT_COMMITTER_DATE = $t0
git commit --amend --no-edit --date=$t0

for ($i = 1; $i -lt $count; $i++) {
    $sha = $commits[$i]
    git cherry-pick $sha
    $t = $start.AddMinutes($i * $interval).ToString("yyyy-MM-ddTHH:mm:sszzz")
    $env:GIT_COMMITTER_DATE = $t
    git commit --amend --no-edit --date=$t
}

git branch -D main
git branch -M temp_fixed_dates main
git push --force origin main
Write-Host "Success!"
