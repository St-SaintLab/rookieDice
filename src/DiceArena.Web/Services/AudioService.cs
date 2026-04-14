using Microsoft.JSInterop;

namespace DiceArena.Web.Services;

public sealed class AudioService
{
    private readonly IJSRuntime _js;

    public AudioService(IJSRuntime js)
    {
        _js = js;
    }

    public ValueTask PlayRollAsync() => _js.InvokeVoidAsync("DiceAudio.playRoll");
    public ValueTask PlayWinAsync() => _js.InvokeVoidAsync("DiceAudio.playWin");
    public ValueTask StopWinAsync() => _js.InvokeVoidAsync("DiceAudio.stopWin");
}