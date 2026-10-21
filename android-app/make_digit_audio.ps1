$ErrorActionPreference = 'Stop'
$taskAudioDir = Join-Path $PSScriptRoot 'audio'
New-Item -ItemType Directory -Force -Path $taskAudioDir | Out-Null
$taskVoice = New-Object -ComObject SAPI.SpVoice
$taskChinese = @($taskVoice.GetVoices() | Where-Object { $_.GetDescription() -match 'Chinese.*Simplified' })
if ($taskChinese.Count -eq 0) { throw 'Offline Simplified Chinese SAPI voice is required.' }
$taskVoice.Voice = $taskChinese[0]
$taskVoice.Rate = -1
$taskVoice.Volume = 90
$taskWords = @(0x4e00,0x4e8c,0x4e09,0x56db,0x4e94,0x516d,0x4e03,0x516b,0x4e5d) | ForEach-Object { [string][char]$_ }
for ($taskIndex = 0; $taskIndex -lt $taskWords.Count; $taskIndex++) {
    $taskStream = New-Object -ComObject SAPI.SpFileStream
    $taskStream.Format.Type = 22
    $taskStream.Open((Join-Path $taskAudioDir ('raw-' + ($taskIndex + 1) + '.wav')), 3, $false)
    $taskVoice.AudioOutputStream = $taskStream
    [void]$taskVoice.Speak($taskWords[$taskIndex])
    $taskStream.Close()
}
Write-Output ('Generated 9 digits with ' + $taskChinese[0].GetDescription())
