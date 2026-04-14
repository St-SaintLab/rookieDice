namespace DiceArena.Web.Models;

public sealed class LeaderboardRecord
{
    public string Mode { get; set; } = string.Empty;
    public string PlayerName { get; set; } = "—";
    public int Score { get; set; }
    public DateTimeOffset AchievedAtUtc { get; set; }
}
