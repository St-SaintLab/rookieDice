namespace DiceArena.Web.Models;

public sealed class DiceDefinition
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "Default";
    public int Sides { get; set; } = 4;
    public string Color { get; set; } = "#7CF7D4";
    public string Style { get; set; } = "Neon";
    public bool IsCustom { get; set; }
}
