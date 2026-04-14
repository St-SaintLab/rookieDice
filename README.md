# DiceArena

Modern casino-style dice web app built with ASP.NET Core Blazor Server-style architecture, HTML5 Canvas animation, and browser audio.

## Project structure
Matches the documented tree under `src/DiceArena.Web` with:
- C# services for game state, rules, dice creation, leaderboard, and audio integration
- Razor components for controls, layout, panels, and the custom dice modal
- Canvas-based animation in `wwwroot/js/canvasDice.js`
- Static assets in `wwwroot/css`, `wwwroot/js`, `wwwroot/sounds`, and `wwwroot/images`

## Notes
- Default setup starts with **2 dice** and **4 sides**.
- Modes cycle through Practice, Vs AI, and Multiplayer.
- Multiplayer requires at least two player names.
- The leaderboard keeps only the top Multiplayer result and the top Vs AI result.
- Probability statistics, save/load UI, and roll history are intentionally excluded.

## Run
Open the solution in Visual Studio or run the web project from `src/DiceArena.Web` in a .NET 8+ environment.

#run 
dotnet clean && dotnet restore && dotnet build && dotnet run --project src\DiceArena.Web
