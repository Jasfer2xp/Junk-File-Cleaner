using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);
var apiToken = builder.Configuration["JUNK_CLEANER_API_TOKEN"]
    ?? Environment.GetEnvironmentVariable("JUNK_CLEANER_API_TOKEN");

// Serialize enums as strings ("TempFile" not 0) and increase request size limit
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Allow large clean requests (up to 100 MB)
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 100_000_000);
builder.WebHost.ConfigureKestrel(k =>
    k.Limits.MaxRequestBodySize = 100_000_000);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001",
                           "file://")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(origin =>
                  string.IsNullOrEmpty(origin) ||
                  origin == "null" ||
                  origin.StartsWith("file://", StringComparison.OrdinalIgnoreCase) ||
                  origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase));
    });
});

builder.WebHost.UseUrls("http://localhost:5000");

var app = builder.Build();

app.UseCors("AllowFrontend");

if (!string.IsNullOrWhiteSpace(apiToken))
{
    app.Use(async (context, next) =>
    {
        if (!context.Request.Headers.TryGetValue("X-JunkCleaner-Token", out var provided) ||
            !string.Equals(provided.ToString(), apiToken, StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }

        await next();
    });
}

app.MapControllers();

app.Run();
