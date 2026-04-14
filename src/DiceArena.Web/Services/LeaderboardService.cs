using System.Text.Json;

using DiceArena.Web.Models;

namespace DiceArena.Web.Services;

public sealed class LeaderboardService
{
    private readonly string _filePath;
    private readonly object _sync = new();
    private LeaderboardState _state = new();

    public LeaderboardService(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "leaderboard.json");
        Load();
    }

    public LeaderboardRecord MultiplayerTop
    {
        get { lock (_sync) return _state.Multiplayer ?? new LeaderboardRecord { Mode = "Multiplayer" }; }
    }

    public LeaderboardRecord VsAiTop
    {
        get { lock (_sync) return _state.VsAi ?? new LeaderboardRecord { Mode = "VsAI" }; }
    }

    public void RegisterResults(GameMode mode, IReadOnlyList<RoundResult> results)
    {
        if (results is null || results.Count == 0)
            return;

        var best = results.OrderByDescending(r => r.Total).First();
        lock (_sync)
        {
            switch (mode)
            {
                case GameMode.Multiplayer:
                    if (_state.Multiplayer is null || best.Total > _state.Multiplayer.Score)
                    {
                        _state.Multiplayer = new LeaderboardRecord
                        {
                            Mode = "Multiplayer",
                            PlayerName = best.ActorName,
                            Score = best.Total,
                            AchievedAtUtc = DateTimeOffset.UtcNow
                        };
                    }
                    break;

                case GameMode.VsAI:
                    if (_state.VsAi is null || best.Total > _state.VsAi.Score)
                    {
                        _state.VsAi = new LeaderboardRecord
                        {
                            Mode = "VsAI",
                            PlayerName = best.ActorName,
                            Score = best.Total,
                            AchievedAtUtc = DateTimeOffset.UtcNow
                        };
                    }
                    break;
            }

            Save();
        }
    }

    public void Reset()
    {
        lock (_sync)
        {
            _state = new LeaderboardState();
            Save();
        }
    }

    private void Load()
    {
        try
        {
            if (!File.Exists(_filePath))
                return;

            var json = File.ReadAllText(_filePath);
            var state = JsonSerializer.Deserialize<LeaderboardState>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (state is not null)
                _state = state;
        }
        catch
        {
            _state = new LeaderboardState();
        }
    }

    private void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            var json = JsonSerializer.Serialize(_state, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_filePath, json);
        }
        catch
        {
            // Persistence is best-effort only.
        }
    }

    private sealed class LeaderboardState
    {
        public LeaderboardRecord? Multiplayer { get; set; }
        public LeaderboardRecord? VsAi { get; set; }
    }
}