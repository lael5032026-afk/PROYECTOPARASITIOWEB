using Microsoft.EntityFrameworkCore;

public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options)
{
    public DbSet<InventoryProduct> InventoryProducts => Set<InventoryProduct>();
    public DbSet<CrmCustomer> CrmCustomers => Set<CrmCustomer>();

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
    }
}