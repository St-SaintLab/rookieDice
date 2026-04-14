using DiceArena.Web;
using DiceArena.Web.Services;
using Microsoft.AspNetCore.Hosting.StaticWebAssets;

var builder = WebApplication.CreateBuilder(args);

StaticWebAssetsLoader.UseStaticWebAssets(builder.Environment, builder.Configuration);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSingleton<DiceRollService>();
builder.Services.AddSingleton<RuleEngineService>();
builder.Services.AddScoped<DiceBuilderService>();
builder.Services.AddSingleton<LeaderboardService>();
builder.Services.AddScoped<AudioService>();
builder.Services.AddScoped<GameStateService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.MapStaticAssets();

app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();