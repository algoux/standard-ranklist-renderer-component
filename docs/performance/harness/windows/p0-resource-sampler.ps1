param(
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [Parameter(Mandatory=$true)][string]$StopPath,
    [Parameter(Mandatory=$true)][int]$BrowserProcessId
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class SrkP0Memory {
    [StructLayout(LayoutKind.Sequential)]
    public struct Info {
        public uint cb;
        public UIntPtr CommitTotal, CommitLimit, CommitPeak;
        public UIntPtr PhysicalTotal, PhysicalAvailable, SystemCache;
        public UIntPtr KernelTotal, KernelPaged, KernelNonpaged, PageSize;
        public uint HandleCount, ProcessCount, ThreadCount;
    }
    [DllImport("psapi.dll", SetLastError=true)]
    public static extern bool GetPerformanceInfo(out Info p, uint cb);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct ProcessEntry {
        public uint dwSize, cntUsage, th32ProcessID;
        public UIntPtr th32DefaultHeapID;
        public uint th32ModuleID, cntThreads, th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)]
        public string szExeFile;
    }
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint processId);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool Process32FirstW(IntPtr snapshot, ref ProcessEntry entry);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool Process32NextW(IntPtr snapshot, ref ProcessEntry entry);
    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr handle);
    public static int[] Descendants(int root) {
        var entries = new List<ProcessEntry>();
        IntPtr snapshot = CreateToolhelp32Snapshot(2, 0);
        if (snapshot == new IntPtr(-1)) throw new System.ComponentModel.Win32Exception();
        try {
            var entry = new ProcessEntry();
            entry.dwSize = (uint)Marshal.SizeOf(typeof(ProcessEntry));
            if (Process32FirstW(snapshot, ref entry)) {
                do { entries.Add(entry); } while (Process32NextW(snapshot, ref entry));
            }
        } finally { CloseHandle(snapshot); }
        var ids = new HashSet<int>();
        ids.Add(root);
        bool added;
        do {
            added = false;
            foreach(var entry in entries)
                if(ids.Contains((int)entry.th32ParentProcessID))
                    added |= ids.Add((int)entry.th32ProcessID);
        } while(added);
        var result = new int[ids.Count];
        ids.CopyTo(result);
        return result;
    }
    public static ulong[] Read() {
        Info p;
        if (!GetPerformanceInfo(out p, (uint)Marshal.SizeOf(typeof(Info))))
            throw new System.ComponentModel.Win32Exception();
        ulong page = p.PageSize.ToUInt64();
        return new ulong[] {
            p.CommitTotal.ToUInt64() * page, p.CommitLimit.ToUInt64() * page,
            p.PhysicalAvailable.ToUInt64() * page, p.PhysicalTotal.ToUInt64() * page
        };
    }
}
'@
$deadline = [DateTime]::UtcNow.AddSeconds(120)
$writer = New-Object IO.StreamWriter($OutputPath, $false, (New-Object Text.UTF8Encoding($false)))
try {
    while (![IO.File]::Exists($StopPath) -and [DateTime]::UtcNow -lt $deadline) {
        $memory = [SrkP0Memory]::Read()
        $usage = @(foreach ($processId in [SrkP0Memory]::Descendants($BrowserProcessId)) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                [PSCustomObject]@{
                    id = $processId
                    workingSetBytes = $process.WorkingSet64
                    privateBytes = $process.PrivateMemorySize64
                    cpuSeconds = $process.TotalProcessorTime.TotalSeconds
                }
            }
        })
        $sample = [PSCustomObject]@{
            utc = [DateTime]::UtcNow.ToString('o')
            committedBytes = $memory[0]
            commitLimitBytes = $memory[1]
            availablePhysicalBytes = $memory[2]
            totalPhysicalBytes = $memory[3]
            processes = $usage
        }
        $writer.WriteLine(($sample | ConvertTo-Json -Depth 5 -Compress))
        $writer.Flush()
        Start-Sleep -Milliseconds 250
    }
} finally { $writer.Dispose() }
