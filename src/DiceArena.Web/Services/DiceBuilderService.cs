using System.Text.Json;

using DiceArena.Web.Models;



namespace DiceArena.Web.Services;



public sealed class DiceBuilderService

{

    private readonly string _dataPath;

    private readonly object _sync = new();

    private readonly List<DiceDefinition> _customDice = new();

    private DiceDefinition _defaultDice = new()

    {

        Id = "default-4-sided",

        Name = "Default 4-sided",

        Sides = 4,

        Color = "#7CF7D4",

        Style = "Neon",

        IsCustom = false

    };



    public DiceBuilderService(IWebHostEnvironment environment)

    {

        _dataPath = Path.Combine(environment.ContentRootPath, "Data");

        LoadDefaultDice();

    }



    public event Action? StateChanged;



    public DiceDefinition DefaultDice

    {

        get { lock (_sync) return _defaultDice; }

    }



    public IReadOnlyList<DiceDefinition> CustomDice

    {

        get { lock (_sync) return _customDice.ToList(); }

    }



    public string? ActiveCustomDiceId { get; private set; }



    public DiceDefinition ActiveDice

    {

        get

        {

            lock (_sync)

            {

                return string.IsNullOrWhiteSpace(ActiveCustomDiceId)

                    ? _defaultDice

                    : _customDice.FirstOrDefault(d => d.Id == ActiveCustomDiceId) ?? _defaultDice;

            }

        }

    }



    public void AddCustomDice(DiceDefinition dice)

    {

        if (dice.Sides < 2)

            dice.Sides = 2;



        lock (_sync)

        {

            dice.Id = Guid.NewGuid().ToString("N");

            dice.IsCustom = true;

            dice.Name = string.IsNullOrWhiteSpace(dice.Name) ? $"Custom {dice.Sides}-sider" : dice.Name;

            _customDice.Add(dice);

            ActiveCustomDiceId = dice.Id;

        }



        Notify();

    }



    public void ActivateCustomDice(string id)

    {

        lock (_sync)

        {

            ActiveCustomDiceId = _customDice.Any(d => d.Id == id) ? id : null;

        }



        Notify();

    }



    public void UseDefault()

    {

        lock (_sync)

        {

            ActiveCustomDiceId = null;

        }



        Notify();

    }



    private void LoadDefaultDice()

    {

        try

        {

            var file = Path.Combine(_dataPath, "default-dice.json");

            if (!File.Exists(file))

                return;



            var json = File.ReadAllText(file);

            var config = JsonSerializer.Deserialize<DefaultDiceConfig>(json, new JsonSerializerOptions

            {

                PropertyNameCaseInsensitive = true

            });



            if (config is null)

                return;



            _defaultDice = new DiceDefinition

            {

                Id = "default-4-sided",

                Name = config.Name ?? "Default 4-sided",

                Sides = config.Sides <= 0 ? 4 : config.Sides,

                Color = config.Color ?? "#7CF7D4",

                Style = config.Style ?? "Neon",

                IsCustom = false

            };

        }

        catch

        {

            // Keep the hard-coded default if the JSON cannot be loaded.

        }

    }



    private void Notify() => StateChanged?.Invoke();



    private sealed class DefaultDiceConfig

    {

        public string? Name { get; set; }

        public int Sides { get; set; }

        public string? Color { get; set; }

        public string? Style { get; set; }

    }

}