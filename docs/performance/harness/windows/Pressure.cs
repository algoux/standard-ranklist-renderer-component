using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

public static class SrkBoundedPressure
{
    [StructLayout(LayoutKind.Sequential)]
    public struct PerformanceInformation
    {
        public uint cb;
        public UIntPtr CommitTotal, CommitLimit, CommitPeak;
        public UIntPtr PhysicalTotal, PhysicalAvailable, SystemCache;
        public UIntPtr KernelTotal, KernelPaged, KernelNonpaged, PageSize;
        public uint HandleCount, ProcessCount, ThreadCount;
    }

    [DllImport("psapi.dll", SetLastError = true)]
    private static extern bool GetPerformanceInfo(out PerformanceInformation info, uint size);

    private static PerformanceInformation Read()
    {
        PerformanceInformation info;
        if (!GetPerformanceInfo(out info, (uint)Marshal.SizeOf(typeof(PerformanceInformation))))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        return info;
    }

    private static ulong Bytes(UIntPtr pages, PerformanceInformation info)
    {
        return pages.ToUInt64() * info.PageSize.ToUInt64();
    }

    public static string Snapshot()
    {
        PerformanceInformation info = Read();
        return "\"commitBytes\":" + Bytes(info.CommitTotal, info)
            + ",\"commitLimitBytes\":" + Bytes(info.CommitLimit, info)
            + ",\"availablePhysicalBytes\":" + Bytes(info.PhysicalAvailable, info);
    }

    private static string UnsafeReason(PerformanceInformation info)
    {
        if (info.CommitTotal.ToUInt64() >= 0.9 * info.CommitLimit.ToUInt64())
            return "commit_at_least_90_percent";
        if (Bytes(info.PhysicalAvailable, info) < 256UL * 1024 * 1024)
            return "available_below_256_MiB";
        return null;
    }

    private static void Log(string file, string phase, long elapsed, long allocated, string reason)
    {
        using (Process self = Process.GetCurrentProcess())
        {
            string line = "{\"utc\":\"" + DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture)
                + "\",\"phase\":\"" + phase + "\",\"elapsedMs\":" + elapsed
                + ",\"allocatedTouchedBytes\":" + allocated
                + ",\"processId\":" + self.Id
                + ",\"workingSetBytes\":" + self.WorkingSet64
                + ",\"privateBytes\":" + self.PrivateMemorySize64
                + ",\"cpuSeconds\":" + self.TotalProcessorTime.TotalSeconds.ToString(CultureInfo.InvariantCulture)
                + "," + Snapshot()
                + ",\"reason\":" + (reason == null ? "null" : "\"" + reason + "\"") + "}";
            File.AppendAllText(file, line + Environment.NewLine);
        }
    }

    public static string Run(string logFile, string stopFile, int seconds, int memoryMiB)
    {
        if (seconds < 1 || seconds > 120 || memoryMiB < 0 || memoryMiB > 1024)
            throw new ArgumentOutOfRangeException("Duration <= 120 seconds and allocation <= 1024 MiB are required");
        List<byte[]> chunks = new List<byte[]>();
        Stopwatch elapsed = Stopwatch.StartNew();
        long allocated = 0;
        string reason = null;
        try
        {
            using (Process self = Process.GetCurrentProcess())
                self.ProcessorAffinity = new IntPtr(1);
            PerformanceInformation initial = Read();
            ulong freeCommit = Bytes(initial.CommitLimit, initial) - Bytes(initial.CommitTotal, initial);
            if (freeCommit < 1.8 * 1024 * 1024 * 1024)
            {
                reason = "initial_commit_headroom_below_1_8_GiB";
                Log(logFile, "refused", elapsed.ElapsedMilliseconds, allocated, reason);
                return reason;
            }
            reason = UnsafeReason(initial);
            if (reason != null)
            {
                Log(logFile, "refused", elapsed.ElapsedMilliseconds, allocated, reason);
                return reason;
            }
            Log(logFile, "start", elapsed.ElapsedMilliseconds, allocated, null);
            long target = (long)memoryMiB * 1024 * 1024;
            Random filler = new Random(20261020);
            while (allocated < target)
            {
                reason = UnsafeReason(Read());
                if (File.Exists(stopFile)) reason = "stop_file";
                if (elapsed.ElapsedMilliseconds >= seconds * 1000L) reason = "deadline";
                if (reason != null) return reason;
                int size = (int)Math.Min(16L * 1024 * 1024, target - allocated);
                byte[] chunk = new byte[size];
                // Touch all bytes with deterministic noise so the allocation is
                // not just reserved virtual memory or a set of compressible zero pages.
                filler.NextBytes(chunk);
                chunks.Add(chunk);
                allocated += size;
            }
            Log(logFile, "allocated", elapsed.ElapsedMilliseconds, allocated, null);
            long nextLog = elapsed.ElapsedMilliseconds;
            // Exactly one busy thread, with this process additionally restricted to one logical CPU.
            while (elapsed.ElapsedMilliseconds < seconds * 1000L)
            {
                reason = UnsafeReason(Read());
                if (File.Exists(stopFile)) reason = "stop_file";
                if (reason != null) return reason;
                if (elapsed.ElapsedMilliseconds >= nextLog)
                {
                    Log(logFile, "holding", elapsed.ElapsedMilliseconds, allocated, null);
                    nextLog = elapsed.ElapsedMilliseconds + 1000;
                }
                long nextCheck = elapsed.ElapsedMilliseconds + 200;
                while (elapsed.ElapsedMilliseconds < nextCheck)
                    Thread.SpinWait(10000);
            }
            reason = "deadline";
            return reason;
        }
        finally
        {
            Log(logFile, "releasing", elapsed.ElapsedMilliseconds, allocated, reason);
            chunks.Clear();
            GC.Collect();
            GC.WaitForPendingFinalizers();
            Log(logFile, "released", elapsed.ElapsedMilliseconds, 0, reason);
        }
    }
}
