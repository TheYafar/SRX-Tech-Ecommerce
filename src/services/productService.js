import { products, categories } from '../data/products';

// Helper to simulate network latency
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const productService = {
  /**
   * Fetch all products
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of products
   */
  async getProducts(options = {}) {
    await delay(300); // Simulate API call
    let filtered = [...products];

    if (options.category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === options.category.toLowerCase()
      );
    }

    if (options.search) {
      const query = options.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.tagline.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (options.featured !== undefined) {
      filtered = filtered.filter((p) => p.featured === options.featured);
    }

    return filtered;
  },

  /**
   * Fetch a single product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>} Product detail or null
   */
  async getProductById(id) {
    await delay(200);
    const product = products.find((p) => p.id === id);
    return product ? { ...product } : null;
  },

  /**
   * Fetch all categories
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    await delay(150);
    return [...categories];
  }
};
