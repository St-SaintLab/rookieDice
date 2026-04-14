namespace DiceArena.Web.Services;

public sealed class DiceRollService
{
    private readonly Random _random = Random.Shared;

    public int[] RollDice(int count, int sides)
    {
        if (count < 1) throw new ArgumentOutOfRangeException(nameof(count));
        if (sides < 2) throw new ArgumentOutOfRangeException(nameof(sides));

        var result = new int[count];
        for (var i = 0; i < count; i++)
        {
            result[i] = _random.Next(1, sides + 1);
        }

        return result;
    }
}
