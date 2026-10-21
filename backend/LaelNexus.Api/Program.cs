using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("LaelNexus")));
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("Frontend");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
    db.Database.EnsureCreated();

    if (!db.InventoryProducts.Any())
    {
        db.InventoryProducts.AddRange(
            new InventoryProduct { Name = "Laptop Pro 14", Category = "Electrónica", Sku = "LAP-014", Stock = 42, MinimumStock = 10, Price = 1299.99m, Status = "Óptimo" },
            new InventoryProduct { Name = "Monitor UltraWide 34", Category = "Electrónica", Sku = "MON-034", Stock = 8, MinimumStock = 12, Price = 649.50m, Status = "Bajo" },
            new InventoryProduct { Name = "Silla Ergonómica Nexus", Category = "Mobiliario", Sku = "SIL-108", Stock = 26, MinimumStock = 8, Price = 289.00m, Status = "Óptimo" },
            new InventoryProduct { Name = "Teclado Mecánico RGB", Category = "Accesorios", Sku = "TEC-220", Stock = 0, MinimumStock = 15, Price = 89.99m, Status = "Agotado" },
            new InventoryProduct { Name = "Cámara de Conferencia 4K", Category = "Electrónica", Sku = "CAM-004", Stock = 15, MinimumStock = 5, Price = 179.99m, Status = "Óptimo" });
        db.SaveChanges();
    }
}

app.MapGet("/api/health", () => Results.Ok(new
{
    service = "LAEL Nexus API",
    status = "operational",
    timestamp = DateTimeOffset.UtcNow
}));

app.MapGet("/api/dashboard/summary", () => Results.Ok(new DashboardSummary(
    Sales: 128450,
    ActiveOrders: 1284,
    ActiveCustomers: 3842,
    AutomatedFlows: 64,
    SalesChange: 18.4m,
    OrdersChange: 12.8m,
    CustomersChange: 8.2m,
    FlowsChange: 24.6m
)));

app.MapGet("/api/inventory", async (string? search, string? status, InventoryDbContext db) =>
{
    IQueryable<InventoryProduct> result = db.InventoryProducts.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(search))
    {
        var normalizedSearch = search.Trim().ToLower();
        result = result.Where(product => product.Name.ToLower().Contains(normalizedSearch) || product.Sku.ToLower().Contains(normalizedSearch) || product.Category.ToLower().Contains(normalizedSearch));
    }

    if (!string.IsNullOrWhiteSpace(status) && !status.Equals("Todos", StringComparison.OrdinalIgnoreCase))
    {
        result = result.Where(product => product.Status == status);
    }

    return Results.Ok(await result.OrderBy(product => product.Name).ToListAsync());
});

app.MapPost("/api/inventory", async (CreateInventoryProduct request, InventoryDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category) || request.Stock < 0 || request.Price < 0)
    {
        return Results.BadRequest(new { message = "Nombre, categoría, stock y precio son obligatorios y deben ser válidos." });
    }

    var product = new InventoryProduct
    {
        Name = request.Name.Trim(),
        Category = request.Category.Trim(),
        Sku = $"SKU-{Random.Shared.Next(100000, 999999)}",
        Stock = request.Stock,
        MinimumStock = request.MinimumStock,
        Price = request.Price,
        Status = request.Stock == 0 ? "Agotado" : request.Stock <= request.MinimumStock ? "Bajo" : "Óptimo"
    };

    db.InventoryProducts.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/api/inventory/{product.Id}", product);
});

app.Run();

internal sealed record DashboardSummary(
    decimal Sales,
    int ActiveOrders,
    int ActiveCustomers,
    int AutomatedFlows,
    decimal SalesChange,
    decimal OrdersChange,
    decimal CustomersChange,
    decimal FlowsChange);

public sealed class InventoryProduct
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int MinimumStock { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; } = string.Empty;
}

internal sealed record CreateInventoryProduct(
    string Name,
    string Category,
    int Stock,
    int MinimumStock,
    decimal Price);
