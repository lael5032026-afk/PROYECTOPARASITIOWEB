using System.ComponentModel.DataAnnotations;
using System.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var frontendOrigins = builder.Configuration.GetSection("Cors:FrontendOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173", "http://localhost:8080"];

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("LaelNexus")));
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(frontendOrigins)
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
    db.Database.ExecuteSqlRaw("IF OBJECT_ID(N'[CrmCustomers]', N'U') IS NULL CREATE TABLE [CrmCustomers] ([Id] int NOT NULL IDENTITY, [Name] nvarchar(160) NOT NULL, [Email] nvarchar(160) NOT NULL, [Company] nvarchar(160) NOT NULL, [Phone] nvarchar(40) NOT NULL, [Status] nvarchar(30) NOT NULL, [LastContact] datetime2 NOT NULL, [Notes] nvarchar(max) NOT NULL, CONSTRAINT [PK_CrmCustomers] PRIMARY KEY ([Id])); IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CrmCustomers_Email') CREATE UNIQUE INDEX [IX_CrmCustomers_Email] ON [CrmCustomers] ([Email]);");
    db.Database.ExecuteSqlRaw("""
        IF OBJECT_ID(N'[StoreOrders]', N'U') IS NULL
            CREATE TABLE [StoreOrders] (
                [Id] int NOT NULL IDENTITY,
                [CustomerName] nvarchar(160) NOT NULL,
                [Email] nvarchar(160) NOT NULL,
                [Phone] nvarchar(40) NOT NULL,
                [ShippingAddress] nvarchar(300) NOT NULL,
                [CreatedAt] datetime2 NOT NULL,
                [Status] nvarchar(40) NOT NULL,
                [Total] decimal(18,2) NOT NULL,
                CONSTRAINT [PK_StoreOrders] PRIMARY KEY ([Id])
            );
        IF OBJECT_ID(N'[StoreOrderItems]', N'U') IS NULL
            CREATE TABLE [StoreOrderItems] (
                [Id] int NOT NULL IDENTITY,
                [OrderId] int NOT NULL,
                [ProductId] int NOT NULL,
                [ProductName] nvarchar(160) NOT NULL,
                [Sku] nvarchar(40) NOT NULL,
                [Quantity] int NOT NULL,
                [UnitPrice] decimal(18,2) NOT NULL,
                CONSTRAINT [PK_StoreOrderItems] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_StoreOrderItems_StoreOrders_OrderId]
                    FOREIGN KEY ([OrderId]) REFERENCES [StoreOrders] ([Id]) ON DELETE CASCADE
            );
        """);

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

    if (!db.CrmCustomers.Any())
    {
        db.CrmCustomers.AddRange(
            new CrmCustomer { Name = "María Rodríguez", Email = "maria@grupodelta.com", Company = "Grupo Delta", Phone = "+34 600 120 401", Status = "Activo", LastContact = DateTime.UtcNow.AddDays(-2), Notes = "Interesada en automatización." },
            new CrmCustomer { Name = "Carlos Méndez", Email = "carlos@innovacionesvega.com", Company = "Innovaciones Vega S.A.", Phone = "+34 600 120 402", Status = "Prospecto", LastContact = DateTime.UtcNow.AddDays(-5), Notes = "Solicitó demostración del CRM." },
            new CrmCustomer { Name = "Ana Torres", Email = "ana@solucionesnorte.com", Company = "Soluciones Norte", Phone = "+34 600 120 403", Status = "Activo", LastContact = DateTime.UtcNow.AddDays(-9), Notes = "Cliente desde 2024." });
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

app.MapPost("/api/store/orders", async (CreateStoreOrder request, InventoryDbContext db) =>
{
    var name = request.CustomerName?.Trim();
    var email = request.Email?.Trim();
    var phone = request.Phone?.Trim();
    var address = request.ShippingAddress?.Trim();

    if (string.IsNullOrWhiteSpace(name) || name.Length > 160 ||
        string.IsNullOrWhiteSpace(email) || email.Length > 160 || !new EmailAddressAttribute().IsValid(email) ||
        string.IsNullOrWhiteSpace(phone) || phone.Length > 40 ||
        string.IsNullOrWhiteSpace(address) || address.Length > 300)
    {
        return Results.BadRequest(new { message = "Completa nombre, correo válido, teléfono y dirección." });
    }

    if (request.Items is null || request.Items.Count is 0 or > 30 ||
        request.Items.Any(item => item.ProductId <= 0 || item.Quantity is < 1 or > 100))
    {
        return Results.BadRequest(new { message = "El pedido debe incluir de 1 a 30 productos, con cantidades entre 1 y 100." });
    }

    var quantities = request.Items
        .GroupBy(item => item.ProductId)
        .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));

    if (quantities.Values.Any(quantity => quantity > 100))
        return Results.BadRequest(new { message = "La cantidad máxima por producto es 100." });

    await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
    var products = await db.InventoryProducts
        .Where(product => quantities.Keys.Contains(product.Id))
        .ToDictionaryAsync(product => product.Id);

    if (products.Count != quantities.Count)
        return Results.BadRequest(new { message = "Uno o más productos ya no están disponibles." });

    foreach (var (productId, quantity) in quantities)
    {
        if (products[productId].Stock < quantity)
            return Results.BadRequest(new { message = $"No hay existencias suficientes de {products[productId].Name}." });
    }

    var items = quantities.Select(entry =>
    {
        var product = products[entry.Key];
        return new StoreOrderItem
        {
            ProductId = product.Id,
            ProductName = product.Name,
            Sku = product.Sku,
            Quantity = entry.Value,
            UnitPrice = product.Price
        };
    }).ToList();

    var order = new StoreOrder
    {
        CustomerName = name,
        Email = email,
        Phone = phone,
        ShippingAddress = address,
        CreatedAt = DateTime.UtcNow,
        Status = "Solicitud sin pago",
        Total = items.Sum(item => item.UnitPrice * item.Quantity),
        Items = items
    };

    db.StoreOrders.Add(order);
    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    return Results.Created($"/api/store/orders/{order.Id}", new
    {
        order.Id,
        order.Status,
        order.Total,
        order.CreatedAt
    });
});

app.MapGet("/api/crm/customers", async (string? search, string? status, InventoryDbContext db) =>
{
    IQueryable<CrmCustomer> result = db.CrmCustomers.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.Trim().ToLower();
        result = result.Where(customer => customer.Name.ToLower().Contains(term) || customer.Email.ToLower().Contains(term) || customer.Company.ToLower().Contains(term));
    }
    if (!string.IsNullOrWhiteSpace(status) && status != "Todos") result = result.Where(customer => customer.Status == status);
    return Results.Ok(await result.OrderBy(customer => customer.Name).ToListAsync());
});

app.MapPost("/api/crm/customers", async (CreateCrmCustomer request, InventoryDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Company))
        return Results.BadRequest(new { message = "Nombre, correo y empresa son obligatorios." });

    var customer = new CrmCustomer { Name = request.Name.Trim(), Email = request.Email.Trim(), Company = request.Company.Trim(), Phone = request.Phone?.Trim() ?? string.Empty, Status = request.Status, LastContact = DateTime.UtcNow, Notes = request.Notes?.Trim() ?? string.Empty };
    db.CrmCustomers.Add(customer);
    await db.SaveChangesAsync();
    return Results.Created($"/api/crm/customers/{customer.Id}", customer);
});

app.MapPut("/api/crm/customers/{id:int}", async (int id, CreateCrmCustomer request, InventoryDbContext db) =>
{
    var customer = await db.CrmCustomers.FindAsync(id);
    if (customer is null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Company))
        return Results.BadRequest(new { message = "Nombre, correo y empresa son obligatorios." });
    customer.Name = request.Name.Trim(); customer.Email = request.Email.Trim(); customer.Company = request.Company.Trim(); customer.Phone = request.Phone?.Trim() ?? string.Empty; customer.Status = request.Status; customer.Notes = request.Notes?.Trim() ?? string.Empty;
    await db.SaveChangesAsync();
    return Results.Ok(customer);
});

app.MapDelete("/api/crm/customers/{id:int}", async (int id, InventoryDbContext db) =>
{
    var customer = await db.CrmCustomers.FindAsync(id);
    if (customer is null) return Results.NotFound();
    db.CrmCustomers.Remove(customer);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/inventory", async (CreateInventoryProduct request, InventoryDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category) || request.Stock < 0 || request.MinimumStock < 0 || request.Price < 0)
    {
        return Results.BadRequest(new { message = "Nombre, categoría, stock, stock mínimo y precio deben ser válidos." });
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

app.MapPut("/api/inventory/{id:int}", async (int id, UpdateInventoryProduct request, InventoryDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category) || request.Stock < 0 || request.MinimumStock < 0 || request.Price < 0)
    {
        return Results.BadRequest(new { message = "Nombre, categoría, stock mínimo, stock y precio deben ser válidos." });
    }

    var product = await db.InventoryProducts.FindAsync(id);
    if (product is null) return Results.NotFound();

    product.Name = request.Name.Trim();
    product.Category = request.Category.Trim();
    product.Stock = request.Stock;
    product.MinimumStock = request.MinimumStock;
    product.Price = request.Price;
    product.Status = request.Stock == 0 ? "Agotado" : request.Stock <= request.MinimumStock ? "Bajo" : "Óptimo";

    await db.SaveChangesAsync();
    return Results.Ok(product);
});

app.MapDelete("/api/inventory/{id:int}", async (int id, InventoryDbContext db) =>
{
    var product = await db.InventoryProducts.FindAsync(id);
    if (product is null) return Results.NotFound();

    db.InventoryProducts.Remove(product);
    await db.SaveChangesAsync();
    return Results.NoContent();
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

public sealed class CrmCustomer
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Prospecto";
    public DateTime LastContact { get; set; }
    public string Notes { get; set; } = string.Empty;
}

internal sealed record CreateCrmCustomer(string Name, string Email, string Company, string? Phone, string Status, string? Notes);

internal sealed record UpdateInventoryProduct(
    string Name,
    string Category,
    int Stock,
    int MinimumStock,
    decimal Price);

internal sealed record CreateStoreOrder(
    string? CustomerName,
    string? Email,
    string? Phone,
    string? ShippingAddress,
    List<StoreOrderLineRequest>? Items);

internal sealed record StoreOrderLineRequest(int ProductId, int Quantity);

public sealed class StoreOrder
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public List<StoreOrderItem> Items { get; set; } = [];
}

public sealed class StoreOrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public StoreOrder Order { get; set; } = null!;
}
