import { Product } from "../types";

interface PendingOperation {
  type: "CREATE" | "UPDATE" | "DELETE";
  product: Product;
  timestamp: number;
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean;
  private isServerAvailable: boolean = true;
  private pendingOperations: PendingOperation[] = [];
  private readonly STORAGE_KEY = "pending_operations";

  private constructor() {
    // Check if we're in a browser environment
    this.isOnline =
      typeof window !== "undefined" ? window.navigator.onLine : true;

    if (typeof window !== "undefined") {
      // Only add event listeners in browser environment
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);

      // Load pending operations from localStorage
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    }
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  public getStatus(): { isOffline: boolean; isServerAvailable: boolean } {
    return {
      isOffline: !this.isOnline || !this.isServerAvailable,
      isServerAvailable: this.isServerAvailable,
    };
  }

  private handleOnline = async () => {
    this.isOnline = true;
    await this.checkServerStatus();
    if (this.isServerAvailable) {
      await this.syncPendingOperations();
    }
  };

  private handleOffline = () => {
    this.isOnline = false;
  };

  public async checkServerStatus(): Promise<void> {
    try {
      const response = await fetch("http://localhost:3001/api/health");
      this.isServerAvailable = response.ok;
    } catch (error) {
      this.isServerAvailable = false;
    }
  }

  public addPendingOperation(operation: PendingOperation): void {
    this.pendingOperations.push(operation);
    this.savePendingOperations();
  }

  private savePendingOperations(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.pendingOperations)
      );
    }
  }

  private syncPendingOperations = async () => {
    if (!this.isOnline || !this.isServerAvailable) return;

    // Make a copy of the operations array
    const operations = [...this.pendingOperations];
    // Clear the pending operations array
    this.pendingOperations = [];
    // Save the empty array to localStorage
    this.savePendingOperations();

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case "CREATE":
            await this.syncCreate(operation);
            break;
          case "UPDATE":
            if (operation.product) {
              await this.syncUpdate(operation.product);
            }
            break;
          case "DELETE":
            if (operation.product && operation.product.id) {
              await this.syncDelete(operation.product.id);
            }
            break;
        }
      } catch (error) {
        console.error("Failed to sync operation:", error);
        // If an operation fails, add it back to pending operations
        this.pendingOperations.push(operation);
        // Save the updated pending operations list
        this.savePendingOperations();
      }
    }
  };

  private async syncCreate(operation: PendingOperation): Promise<void> {
    try {
      const response = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.product),
      });

      if (!response.ok) {
        throw new Error("Failed to sync create");
      }
    } catch (error) {
      console.error("Failed to sync create:", error);
      throw error;
    }
  }

  private syncUpdate = async (product: Product) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/products/${product.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        }
      );
      if (!response.ok) throw new Error("Failed to sync update");
    } catch (error) {
      console.error("Failed to sync update:", error);
      throw error;
    }
  };

  private syncDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to sync delete");
    } catch (error) {
      console.error("Failed to sync delete:", error);
      throw error;
    }
  };
}

export default OfflineService;
