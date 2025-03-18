import { productService } from "../productService";

describe("ProductService", () => {
  const testProduct = {
    name: "Test Product",
    price: 99.99,
    image: "https://example.com/test.jpg",
    description: "Test product description that is long enough",
    category: "Test Category",
  };

  describe("addProduct", () => {
    it("should add a valid product", () => {
      const result = productService.addProduct(testProduct);
      expect(result.product).toBeDefined();
      expect(result.product?.name).toBe(testProduct.name);
      expect(result.errors).toBeUndefined();
    });

    it("should validate product fields", () => {
      const invalidProduct = {
        name: "a",
        price: -1,
        image: "",
        description: "short",
        category: "",
      };
      const result = productService.addProduct(invalidProduct);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.product).toBeUndefined();
    });
  });

  describe("getProducts", () => {
    it("should return all products without filters", () => {
      const products = productService.getProducts();
      expect(products.length).toBeGreaterThan(0);
    });

    it("should filter products by category", () => {
      const category = "Test Category";
      const products = productService.getProducts({ category });
      expect(products.every((p) => p.category === category)).toBe(true);
    });

    it("should filter products by price range", () => {
      const minPrice = 50;
      const maxPrice = 150;
      const products = productService.getProducts({ minPrice, maxPrice });
      expect(
        products.every((p) => p.price >= minPrice && p.price <= maxPrice)
      ).toBe(true);
    });

    it("should sort products", () => {
      const products = productService.getProducts(undefined, "price", "asc");
      for (let i = 1; i < products.length; i++) {
        expect(products[i].price).toBeGreaterThanOrEqual(products[i - 1].price);
      }
    });
  });

  describe("updateProduct", () => {
    it("should update an existing product", () => {
      const products = productService.getProducts();
      const existingId = products[0].id;
      const updatedName = "Updated Product";

      const result = productService.updateProduct(existingId, {
        ...testProduct,
        name: updatedName,
      });

      expect(result.product).toBeDefined();
      expect(result.product?.name).toBe(updatedName);
      expect(result.errors).toBeUndefined();
    });

    it("should return error for non-existent product", () => {
      const result = productService.updateProduct(-1, testProduct);
      expect(result.errors).toBeDefined();
      expect(result.product).toBeUndefined();
    });
  });

  describe("deleteProduct", () => {
    it("should delete an existing product", () => {
      const products = productService.getProducts();
      const existingId = products[0].id;

      const result = productService.deleteProduct(existingId);
      expect(result).toBe(true);

      const updatedProducts = productService.getProducts();
      expect(updatedProducts.find((p) => p.id === existingId)).toBeUndefined();
    });

    it("should return false for non-existent product", () => {
      const result = productService.deleteProduct(-1);
      expect(result).toBe(false);
    });
  });
});
