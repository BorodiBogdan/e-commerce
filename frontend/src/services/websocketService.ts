import { Product } from "../types";

class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private listeners: ((product: Product) => void)[] = [];

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect() {
    if (this.socket) {
      return;
    }

    this.socket = new WebSocket("ws://localhost:3001/ws");

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    this.socket.onmessage = (event) => {
      try {
        const product = JSON.parse(event.data);
        this.notifyListeners(product);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      this.socket = null;
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public addListener(listener: (product: Product) => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: (product: Product) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(product: Product) {
    this.listeners.forEach((listener) => listener(product));
  }
}

export default WebSocketService;
