using DiceArena.Web.Models;



namespace DiceArena.Web.Services;



public sealed class GameStateService

{

    private readonly DiceRollService _rollService;

    private readonly RuleEngineService _ruleEngine;

    private readonly DiceBuilderService _builder;

    private readonly LeaderboardService _leaderboard;

    private readonly List<RoundResult> _results = new();

    private readonly List<string> _multiplayerPlayers = new() { "Player 1", "Player 2" };

    private readonly List<PlayerEntry> _sessionPlayers = new();

    private readonly List<int> _turnOrder = new();

    private int _turnIndex;

    private int _roundIndex;



    public GameStateService(

        DiceRollService rollService,

        RuleEngineService ruleEngine,

        DiceBuilderService builder,

        LeaderboardService leaderboard)

    {

        _rollService = rollService;

        _ruleEngine = ruleEngine;

        _builder = builder;

        _leaderboard = leaderboard;

        DiceCount = 2;

        StatusText = "Ready to roll";

    }



    public event Action? StateChanged;



    public GameMode CurrentMode { get; private set; } = GameMode.Practice;

    public int DiceCount { get; private set; }

    public bool IsPaused { get; private set; }

    public bool IsRolling { get; private set; }

    public string StatusText { get; private set; }



    public IReadOnlyList<RoundResult> CurrentResults => _results;



    public LeaderboardView Leaderboard => new(_leaderboard.MultiplayerTop, _leaderboard.VsAiTop);



    public IReadOnlyList<string> PlayerNames => _multiplayerPlayers;



    public int CurrentDiceSides => _builder.ActiveDice.Sides;



    public string ActiveDiceLabel => _builder.ActiveDice.IsCustom

        ? $"{_builder.ActiveDice.Name} · {_builder.ActiveDice.Sides} sides"

        : "Default setup";



    public bool CanRoll => !IsPaused && !IsRolling;



    public void CycleMode()

    {

        CurrentMode = CurrentMode switch

        {

            GameMode.Practice => GameMode.VsAI,

            GameMode.VsAI => GameMode.Multiplayer,

            _ => GameMode.Practice

        };



        if (CurrentMode != GameMode.Multiplayer && _multiplayerPlayers.Count < 2)

        {

            _multiplayerPlayers.Clear();

            _multiplayerPlayers.Add("Player 1");

            _multiplayerPlayers.Add("Player 2");

        }



        ResetSession();

        StatusText = $"Switched to {CurrentMode}.";

        Notify();

    }



    public void SetMode(GameMode mode)

    {

        if (CurrentMode == mode)

            return;



        CurrentMode = mode;

        ResetSession();

        StatusText = $"Switched to {CurrentMode}.";

        Notify();

    }



    public RoundResult RollVsAiTurn(string actorName, bool isFinalTurn)

    {

        if (CurrentMode != GameMode.VsAI)

            throw new InvalidOperationException("This turn flow is only available in Vs AI mode.");



        if (!IsRolling)

        {

            _results.Clear();

            BuildSessionPlayers();

            IsRolling = true;

        }



        var result = BuildActorResult(actorName, _ruleEngine.GetRuleLabel(DiceCount), _builder.ActiveDice, allowWinner: true);



        var actor = _sessionPlayers.FirstOrDefault(p => string.Equals(p.Name, actorName, StringComparison.OrdinalIgnoreCase));

        if (actor is not null)

        {

            actor.Score += result.Total;

        }



        _results.Add(result);

        _leaderboard.RegisterResults(CurrentMode, new[] { result });



        if (result.IsWinner || isFinalTurn)

        {

            IsRolling = false;

            StatusText = result.IsWinner

                ? $"{actorName} wins with {result.Total}!"

                : $"{actorName} rolled {result.Total}.";

        }

        else

        {

            StatusText = $"{actorName} rolled {result.Total}.";

        }



        Notify();

        return result;

    }



    public void StartAutoPlaySession()

    {

        if (IsRolling)

            return;



        _results.Clear();

        _sessionPlayers.Clear();

        _turnOrder.Clear();

        _turnIndex = 0;

        _roundIndex = 0;



        BuildSessionPlayers();

        BuildTurnOrder();



        IsRolling = true;

        StatusText = "Rolling the dice...";

        Notify();

    }



    public RoundResult RollNextTurn()

    {

        if (!IsRolling)

            StartAutoPlaySession();



        if (CurrentMode == GameMode.Practice)

        {

            var result = BuildActorResult("User", _ruleEngine.GetRuleLabel(DiceCount), _builder.ActiveDice, allowWinner: true);

            _results.Add(result);

            _leaderboard.RegisterResults(CurrentMode, new[] { result });

            IsRolling = false;

            StatusText = result.IsWinner ? "User wins!" : "Round complete.";

            Notify();

            return result;

        }



        if (_turnOrder.Count == 0)

            BuildTurnOrder();



        if (_turnIndex >= _turnOrder.Count)

        {

            _turnIndex = 0;

            _roundIndex++;

        }



        var actorIndex = _turnOrder[_turnIndex];

        var actor = _sessionPlayers[actorIndex];

        var canWinThisRound = _roundIndex > 0;



        var turnResult = BuildActorResult(actor.Name, _ruleEngine.GetRuleLabel(DiceCount), _builder.ActiveDice, allowWinner: canWinThisRound);

        actor.Score += turnResult.Total;



        _results.Add(turnResult);

        _leaderboard.RegisterResults(CurrentMode, new[] { turnResult });



        _turnIndex++;



        if (turnResult.IsWinner)

        {

            IsRolling = false;

            StatusText = $"{actor.Name} wins with {turnResult.Total}!";

        }

        else if (_turnIndex >= _turnOrder.Count)

        {

            _turnIndex = 0;

            _roundIndex++;

            StatusText = _roundIndex == 1

                ? "First round complete. Continuing..."

                : $"Round {_roundIndex} complete. Continuing...";

        }

        else

        {

            StatusText = $"{actor.Name} rolled {turnResult.Total}.";

        }



        Notify();

        return turnResult;

    }



    public RoundResult BeginMultiplayerTurn()

    {

        if (CurrentMode != GameMode.Multiplayer)

            throw new InvalidOperationException("This turn flow is only available in multiplayer mode.");



        EnsureMultiplayerSession();



        IsRolling = true;



        var actor = _sessionPlayers[_turnOrder[_turnIndex]];

        var result = BuildActorResult(actor.Name, _ruleEngine.GetRuleLabel(DiceCount), _builder.ActiveDice, allowWinner: _roundIndex > 0);



        actor.Score += result.Total;

        _results.Add(result);



        StatusText = "Rolling the dice...";

        Notify();



        return result;

    }



    public void CompleteMultiplayerTurn(RoundResult result)

    {

        if (CurrentMode != GameMode.Multiplayer)

            return;



        _leaderboard.RegisterResults(CurrentMode, new[] { result });



        if (result.IsWinner)

        {

            IsRolling = false;

            StatusText = $"{result.ActorName} wins with {result.Total}!";

            Notify();

            return;

        }



        AdvanceMultiplayerTurn();

        IsRolling = false;



        var nextActorName = _sessionPlayers[_turnOrder[_turnIndex]].Name;

        StatusText = _roundIndex == 0

            ? $"Next player: {nextActorName}."

            : $"Round {_roundIndex + 1} in progress. Next player: {nextActorName}.";



        Notify();

    }



    public void SetDiceCount(int count)

    {

        if (count is < 2 or > 4)

            return;



        DiceCount = count;

        StatusText = $"Selected {count} dice.";

        Notify();

    }



    public void TogglePause()

    {

        IsPaused = !IsPaused;

        StatusText = IsPaused ? "Game paused." : "Game resumed.";

        Notify();

    }



    public void RestartCurrentGame()

    {

        IsPaused = false;

        ResetSession();

        StatusText = "Game restarted.";

        Notify();

    }



    public string? ValidateBeforeRoll()

    {

        if (IsPaused)

            return "Resume the game before rolling.";



        if (CurrentMode == GameMode.Multiplayer)

        {

            var validNames = _multiplayerPlayers.Count(p => !string.IsNullOrWhiteSpace(p));

            if (validNames < 2)

                return "Multiplayer mode requires two or more player names.";

        }



        return null;

    }



    public IReadOnlyList<RoundResult> BuildRound()

    {

        IsRolling = true;

        _results.Clear();



        var definition = _builder.ActiveDice;

        var ruleLabel = _ruleEngine.GetRuleLabel(DiceCount);



        switch (CurrentMode)

        {

            case GameMode.Practice:

                _results.Add(BuildActorResult("User", ruleLabel, definition));

                break;



            case GameMode.VsAI:

                _results.Add(BuildActorResult("You", ruleLabel, definition));

                _results.Add(BuildActorResult("AI", ruleLabel, definition));

                break;



            case GameMode.Multiplayer:

                for (var i = 0; i < _multiplayerPlayers.Count; i++)

                {

                    var name = string.IsNullOrWhiteSpace(_multiplayerPlayers[i]) ? $"Player {i + 1}" : _multiplayerPlayers[i];

                    _results.Add(BuildActorResult(name, ruleLabel, definition));

                }



                break;

        }



        return _results.ToList();

    }



    public void CommitRound(IReadOnlyList<RoundResult> results)

    {

        _leaderboard.RegisterResults(CurrentMode, results);

        IsRolling = false;

        StatusText = results.Any(r => r.IsWinner) ? "Winning roll highlighted." : "Round complete.";

        Notify();

    }



    public void UseCustomDice(string id)

    {

        _builder.ActivateCustomDice(id);

        _results.Clear();

        IsRolling = false;

        StatusText = _builder.ActiveDice.IsCustom

            ? $"Custom dice activated: {_builder.ActiveDice.Name}."

            : "Default setup active.";

        Notify();

    }



    public void AddMultiplayerPlayer()

    {

        if (_multiplayerPlayers.Count < 4)

        {

            _multiplayerPlayers.Add($"Player {_multiplayerPlayers.Count + 1}");

            StatusText = "Added a player slot.";

            Notify();

        }

    }



    public void RemoveMultiplayerPlayer()

    {

        if (_multiplayerPlayers.Count > 2)

        {

            _multiplayerPlayers.RemoveAt(_multiplayerPlayers.Count - 1);

            StatusText = "Removed a player slot.";

            Notify();

        }

    }



    public void SetPlayerName(int index, string name)

    {

        if (index < 0 || index >= _multiplayerPlayers.Count)

            return;



        _multiplayerPlayers[index] = name;

        Notify();

    }



    public void SetStatus(string message)

    {

        StatusText = message;

        Notify();

    }



    private void EnsureMultiplayerSession()

    {

        if (_sessionPlayers.Count > 0 && _turnOrder.Count > 0)

            return;



        _sessionPlayers.Clear();

        _turnOrder.Clear();

        _turnIndex = 0;

        _roundIndex = 0;

        _results.Clear();



        for (var i = 0; i < _multiplayerPlayers.Count; i++)

        {

            var name = string.IsNullOrWhiteSpace(_multiplayerPlayers[i]) ? $"Player {i + 1}" : _multiplayerPlayers[i];

            _sessionPlayers.Add(new PlayerEntry { Name = name, Score = 0 });

        }



        if (_sessionPlayers.Count == 0)

            return;



        var firstIndex = Random.Shared.Next(_sessionPlayers.Count);

        for (var i = 0; i < _sessionPlayers.Count; i++)

        {

            _turnOrder.Add((firstIndex + i) % _sessionPlayers.Count);

        }

    }



    private void AdvanceMultiplayerTurn()

    {

        _turnIndex++;



        if (_turnIndex >= _turnOrder.Count)

        {

            _turnIndex = 0;

            _roundIndex++;

        }

    }



    private void BuildSessionPlayers()

    {

        _sessionPlayers.Clear();



        switch (CurrentMode)

        {

            case GameMode.Practice:

                _sessionPlayers.Add(new PlayerEntry { Name = "User" });

                break;



            case GameMode.VsAI:

                _sessionPlayers.Add(new PlayerEntry { Name = "You" });

                _sessionPlayers.Add(new PlayerEntry { Name = "AI" });

                break;



            case GameMode.Multiplayer:

                for (var i = 0; i < _multiplayerPlayers.Count; i++)

                {

                    var name = string.IsNullOrWhiteSpace(_multiplayerPlayers[i]) ? $"Player {i + 1}" : _multiplayerPlayers[i];

                    _sessionPlayers.Add(new PlayerEntry { Name = name });

                }



                break;

        }

    }



    private void BuildTurnOrder()

    {

        _turnOrder.Clear();

        _turnOrder.AddRange(Enumerable.Range(0, _sessionPlayers.Count));



        for (var i = _turnOrder.Count - 1; i > 0; i--)

        {

            var j = Random.Shared.Next(i + 1);

            (_turnOrder[i], _turnOrder[j]) = (_turnOrder[j], _turnOrder[i]);

        }

    }



    private void ResetSession()

    {

        IsPaused = false;

        IsRolling = false;

        _results.Clear();

        _sessionPlayers.Clear();

        _turnOrder.Clear();

        _turnIndex = 0;

        _roundIndex = 0;

    }



    private RoundResult BuildActorResult(string name, string ruleLabel, DiceDefinition definition, bool allowWinner = true)

    {

        var diceValues = _rollService.RollDice(DiceCount, definition.Sides);

        var total = diceValues.Sum();

        var winning = _ruleEngine.IsWinningTotal(total, DiceCount);



        return new RoundResult

        {

            ActorName = name,

            DiceValues = diceValues,

            Total = total,

            IsWinner = allowWinner && winning,

            Mode = CurrentMode,

            RuleLabel = ruleLabel,

            Color = definition.Color,

            Style = definition.Style

        };

    }



    private void Notify() => StateChanged?.Invoke();



    public sealed record LeaderboardView(LeaderboardRecord MultiplayerTop, LeaderboardRecord VsAiTop)

    {

        public string MultiplayerPlayerName => MultiplayerTop.PlayerName;

        public int MultiplayerScore => MultiplayerTop.Score;

        public string VsAiPlayerName => VsAiTop.PlayerName;

        public int VsAiScore => VsAiTop.Score;

    }

}