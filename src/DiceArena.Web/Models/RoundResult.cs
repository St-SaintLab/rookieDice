namespace DiceArena.Web.Models;

public sealed class RoundResult
{
    public string ActorName { get; set; } = string.Empty;
    public IReadOnlyList<int> DiceValues { get; set; } = Array.Empty<int>();
    public int Total { get; set; }
    public bool IsWinner { get; set; }
    public GameMode Mode { get; set; }
    public string RuleLabel { get; set; } = string.Empty;
    public string Color { get; set; } = "#7CF7D4";
    public string Style { get; set; } = "Neon";
}
