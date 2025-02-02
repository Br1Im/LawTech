# Simple script to set file dates to 4 months ago
$fourMonthsAgo = (Get-Date).AddMonths(-4)
$baseDate = $fourMonthsAgo
$random = New-Object System.Random

Write-Host "Setting files dates around: $($baseDate.ToString('yyyy-MM-dd'))"

# Get random date within range
function Get-RandomDate {
    param (
        [DateTime]$BaseDate,
        [int]$RangeInDays = 14
    )
    
    $randomOffset = $random.Next(-$RangeInDays, $RangeInDays)
    $randomHours = $random.Next(0, 24)
    $randomMinutes = $random.Next(0, 60)
    
    return $BaseDate.AddDays($randomOffset).AddHours($randomHours).AddMinutes($randomMinutes)
}

# Process directory recursively
function Process-Directory {
    param (
        [string]$Path,
        [string[]]$ExcludeDirs = @(".git", "node_modules")
    )
    
    # Process files
    Get-ChildItem -Path $Path -File | ForEach-Object {
        $randomDate = Get-RandomDate -BaseDate $baseDate
        try {
            $_.CreationTime = $randomDate
            $_.LastWriteTime = $randomDate
            $_.LastAccessTime = $randomDate
            
            Write-Host "Processed: $($_.Name) -> $($randomDate.ToString('yyyy-MM-dd HH:mm'))"
        } catch {
            Write-Host "Error processing $($_.Name): $_"
        }
    }
    
    # Process subdirectories
    Get-ChildItem -Path $Path -Directory | Where-Object { $ExcludeDirs -notcontains $_.Name } | ForEach-Object {
        Write-Host "Processing directory: $($_.Name)"
        Process-Directory -Path $_.FullName -ExcludeDirs $ExcludeDirs
    }
}

# Start processing from current directory
Process-Directory -Path "."

Write-Host "All files dated successfully." 