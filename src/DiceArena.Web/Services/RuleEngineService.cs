namespace DiceArena.Web.Services;

public sealed class RuleEngineService
{
    public bool IsWinningTotal(int total, int diceCount)
    {
        if (total < 1)
            return false;

        var power = diceCount switch
        {
            2 => 2,
            3 => 3,
            4 => 4,
            _ => 2
        };

        var root = Math.Round(Math.Pow(total, 1d / power));
        var candidate = (int)Math.Pow(root, power);
        return candidate == total;
    }

    public string GetRuleLabel(int diceCount) => diceCount switch
    {
        2 => "Perfect square",
        3 => "Perfect cube",
        4 => "Perfect fourth power",
        _ => "Perfect square"
    };
}
