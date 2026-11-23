$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()

$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$workerScript = Join-Path $PSScriptRoot 'Push-News.ps1'
$env:GIT_TERMINAL_PROMPT = '0'

$form = [Windows.Forms.Form]::new()
$form.Text = 'Homepage News Publisher'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = [Drawing.Size]::new(470, 322)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.AutoScaleMode = 'Dpi'
$form.Font = [Drawing.Font]::new('Segoe UI', 9)

function Add-FieldLabel ([string]$Text, [int]$Top) {
    $label = [Windows.Forms.Label]::new()
    $label.Text = $Text
    $label.AutoSize = $true
    $label.Location = [Drawing.Point]::new(18, $Top)
    $form.Controls.Add($label)
}

Add-FieldLabel 'Date' 16
$dateField = [Windows.Forms.DateTimePicker]::new()
$dateField.Format = 'Custom'
$dateField.CustomFormat = 'yyyy-MM-dd'
$dateField.Value = [datetime]::Today
$dateField.SetBounds(18, 36, 150, 25)
$form.Controls.Add($dateField)

Add-FieldLabel 'News text' 70
$contentField = [Windows.Forms.TextBox]::new()
$contentField.Multiline = $true
$contentField.ScrollBars = 'Vertical'
$contentField.SetBounds(18, 90, 434, 66)
$form.Controls.Add($contentField)

Add-FieldLabel 'URL (optional)' 165
$urlField = [Windows.Forms.TextBox]::new()
$urlField.SetBounds(18, 185, 434, 25)
$form.Controls.Add($urlField)

Add-FieldLabel 'Git proxy (optional, e.g. http://127.0.0.1:7890)' 218
$proxyField = [Windows.Forms.TextBox]::new()
$proxyField.SetBounds(18, 238, 434, 25)
$form.Controls.Add($proxyField)

$status = [Windows.Forms.Label]::new()
$status.SetBounds(18, 275, 324, 36)
$form.Controls.Add($status)

$publish = [Windows.Forms.Button]::new()
$publish.Text = 'Publish'
$publish.SetBounds(354, 276, 98, 29)
$form.Controls.Add($publish)
$form.AcceptButton = $publish
$form.ActiveControl = $contentField

$fields = @($dateField, $contentField, $urlField, $proxyField, $publish)
$timer = [Windows.Forms.Timer]::new()
$timer.Interval = 150
$script:job = $null
$script:worker = $null

$timer.Add_Tick({
    if (!$script:job.IsCompleted) { return }
    $timer.Stop()
    try {
        $result = $script:worker.EndInvoke($script:job)
        $status.Text = 'Published to GitHub.'
        if (!$result[0].LocalUpdated) {
            $status.Text = 'Published to GitHub. Local main may need a pull.'
        }
        $contentField.Clear()
        $urlField.Clear()
    } catch {
        $status.Text = 'Publish failed. You can retry.'
        $message = if ($script:worker.Streams.Error.Count) {
            $script:worker.Streams.Error[0].Exception.Message
        } else {
            $_.Exception.GetBaseException().Message
        }
        [void][Windows.Forms.MessageBox]::Show($form, $message, 'Publish failed', 'OK', 'Error')
    } finally {
        $script:worker.Dispose()
        $script:job = $null
        $fields | ForEach-Object { $_.Enabled = $true }
        $contentField.Focus() | Out-Null
    }
})

$publish.Add_Click({
    if ([string]::IsNullOrWhiteSpace($contentField.Text)) {
        $status.Text = 'Enter the news text.'
        $contentField.Focus() | Out-Null
        return
    }

    $fields | ForEach-Object { $_.Enabled = $false }
    $status.Text = 'Publishing to GitHub...'
    $script:worker = [PowerShell]::Create()
    try {
        [void]$script:worker.AddCommand($workerScript).
            AddParameter('Repository', $repository).
            AddParameter('Date', $dateField.Value).
            AddParameter('Content', $contentField.Text).
            AddParameter('Url', $urlField.Text).
            AddParameter('Proxy', $proxyField.Text)
        $script:job = $script:worker.BeginInvoke()
        $timer.Start()
    } catch {
        $script:worker.Dispose()
        $fields | ForEach-Object { $_.Enabled = $true }
        $status.Text = 'Publish failed. You can retry.'
        [void][Windows.Forms.MessageBox]::Show($form, $_.Exception.Message, 'Publish failed', 'OK', 'Error')
    }
})

$form.Add_FormClosing({
    param($sender, $eventArgs)
    $eventArgs.Cancel = $null -ne $script:job
})

try {
    [void]$form.ShowDialog()
} finally {
    $timer.Dispose()
    $form.Dispose()
}
