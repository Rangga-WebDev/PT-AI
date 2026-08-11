$mig = Get-ChildItem supabase\migrations\*.sql | Sort-Object Name
$all = ($mig | Get-Content -Raw) -join "`n"

$tables = [regex]::Matches($all, '(?im)^create table (public|research)\.(\w+)') | ForEach-Object { $_.Groups[2].Value } | Sort-Object -Unique
$publicTables = [regex]::Matches($all, '(?im)^create table public\.(\w+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$funcs = [regex]::Matches($all, '(?im)^create or replace function public\.(\w+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

Write-Host "Tabel terdefinisi   : $($tables.Count) (public: $($publicTables.Count))"
Write-Host "Fungsi terdefinisi  : $($funcs.Count)"

$policyFile = Get-Content (Get-ChildItem supabase\migrations\*_rls_policies.sql).FullName -Raw
$calledFuncs = [regex]::Matches($policyFile, 'public\.(\w+)\s*\(') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$missingFuncs = @($calledFuncs | Where-Object { $_ -notin $funcs })
Write-Host "`n[1] Fungsi dipakai policy tapi TIDAK terdefinisi:"
if ($missingFuncs.Count) { $missingFuncs | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$policyTables = [regex]::Matches($policyFile, '(?im)^create policy \w+ on (public|research)\.(\w+)') | ForEach-Object { $_.Groups[2].Value } | Sort-Object -Unique
$missingTables = @($policyTables | Where-Object { $_ -notin $tables })
Write-Host "`n[2] Tabel dirujuk policy tapi TIDAK terdefinisi:"
if ($missingTables.Count) { $missingTables | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$trigFile = Get-Content (Get-ChildItem supabase\migrations\*_functions_and_triggers.sql).FullName -Raw
$listed = [regex]::Matches($trigFile, "(?m)^\s+'(\w+)',?\s*$") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$badList = @($listed | Where-Object { $_ -notin $tables })
Write-Host "`n[3] Nama tabel di daftar trigger yang TIDAK ada:"
if ($badList.Count) { $badList | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$noPolicy = @($publicTables | Where-Object { $_ -notin $policyTables })
Write-Host "`n[4] Tabel public TANPA policy apa pun:"
if ($noPolicy.Count) { $noPolicy | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$refs = [regex]::Matches($all, 'references (public|research)\.(\w+)') | ForEach-Object { $_.Groups[2].Value } | Sort-Object -Unique
$badRefs = @($refs | Where-Object { $_ -notin $tables })
Write-Host "`n[5] Foreign key menunjuk tabel yang TIDAK ada:"
if ($badRefs.Count) { $badRefs | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$types = [regex]::Matches($all, '(?im)^create type public\.(\w+) as enum') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$usedTypes = [regex]::Matches($all, 'public\.(\w+)(?:\[\])?(?:\s|,|\)|;)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$unusedTypes = @($types | Where-Object { $_ -notin $usedTypes })
Write-Host "`n[6] Enum terdefinisi: $($types.Count); tidak terpakai:"
if ($unusedTypes.Count) { $unusedTypes | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }

$idx = Get-Content (Get-ChildItem supabase\migrations\*_indexes.sql).FullName -Raw
$idxTables = [regex]::Matches($idx, 'on public\.(\w+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$badIdx = @($idxTables | Where-Object { $_ -notin $tables })
Write-Host "`n[7] Index pada tabel yang TIDAK ada:"
if ($badIdx.Count) { $badIdx | ForEach-Object { "    - $_" } } else { "    (tidak ada)" }
