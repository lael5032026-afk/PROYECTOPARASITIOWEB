using Microsoft.EntityFrameworkCore;

public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options)
{
    public DbSet<InventoryProduct> InventoryProducts => Set<InventoryProduct>();
    public DbSet<CrmCustomer> CrmCustomers => Set<CrmCustomer>();
    public DbSet<StoreOrder> StoreOrders => Set<StoreOrder>();
    public DbSet<StoreOrderItem> StoreOrderItems => Set<StoreOrderItem>();
    public DbSet<SoftwarePlanRequest> SoftwarePlanRequests => Set<SoftwarePlanRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<InventoryProduct>(entity =>
        {
            entity.HasKey(product => product.Id);
            entity.Property(product => product.Name).HasMaxLength(160).IsRequired();
            entity.Property(product => product.Category).HasMaxLength(80).IsRequired();
            entity.Property(product => product.Sku).HasMaxLength(40).IsRequired();
            entity.HasIndex(product => product.Sku).IsUnique();
            entity.Property(product => product.Price).HasPrecision(18, 2);
            entity.Property(product => product.Status).HasMaxLength(20).IsRequired();
        });

        modelBuilder.Entity<CrmCustomer>(entity =>
        {
            entity.HasKey(customer => customer.Id);
            entity.Property(customer => customer.Name).HasMaxLength(160).IsRequired();
            entity.Property(customer => customer.Email).HasMaxLength(160).IsRequired();
            entity.Property(customer => customer.Company).HasMaxLength(160).IsRequired();
            entity.Property(customer => customer.Phone).HasMaxLength(40);
            entity.Property(customer => customer.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(customer => customer.Email).IsUnique();
        });

        modelBuilder.Entity<StoreOrder>(entity =>
        {
            entity.HasKey(order => order.Id);
            entity.Property(order => order.CustomerName).HasMaxLength(160).IsRequired();
            entity.Property(order => order.Email).HasMaxLength(160).IsRequired();
            entity.Property(order => order.Phone).HasMaxLength(40).IsRequired();
            entity.Property(order => order.ShippingAddress).HasMaxLength(300).IsRequired();
            entity.Property(order => order.Status).HasMaxLength(40).IsRequired();
            entity.Property(order => order.Total).HasPrecision(18, 2);
            entity.HasMany(order => order.Items)
                .WithOne(item => item.Order)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreOrderItem>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ProductName).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Sku).HasMaxLength(40).IsRequired();
            entity.Property(item => item.UnitPrice).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SoftwarePlanRequest>(entity =>
        {
            entity.HasKey(request => request.Id);
            entity.Property(request => request.SoftwareCode).HasMaxLength(60).IsRequired();
            entity.Property(request => request.SoftwareName).HasMaxLength(160).IsRequired();
            entity.Property(request => request.CustomerName).HasMaxLength(160).IsRequired();
            entity.Property(request => request.Email).HasMaxLength(160).IsRequired();
            entity.Property(request => request.Company).HasMaxLength(160).IsRequired();
            entity.Property(request => request.PlanPeriod).HasMaxLength(20).IsRequired();
            entity.Property(request => request.Status).HasMaxLength(40).IsRequired();
        });
    }
}