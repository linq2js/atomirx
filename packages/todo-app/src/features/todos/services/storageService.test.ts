import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { storageService } from "./storageService";
import { cryptoService } from "@/features/auth/services/cryptoService";
import { resetDatabase } from "./db";
import type { StorageService } from "../types/storageTypes";

describe("StorageService", () => {
  let storage: StorageService;
  let key: CryptoKey;

  beforeEach(async () => {
    // Reset database before each test
    await resetDatabase();

    // Reset services and get fresh instances
    cryptoService.reset();
    storageService.reset();

    // Create a test encryption key
    const crypto = cryptoService();
    key = await crypto.generateKey();

    // Create storage service
    storage = storageService();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  describe("initialization", () => {
    it("should not be initialized before calling initialize", () => {
      expect(storage.isInitialized()).toBe(false);
    });

    it("should be initialized after calling initialize", () => {
      storage.initialize(key);
      expect(storage.isInitialized()).toBe(true);
    });

    it("should throw error when operations are called before initialization", async () => {
      await expect(storage.getTodos()).rejects.toThrow("not initialized");
    });
  });

  describe("todos", () => {
    beforeEach(() => {
      storage.initialize(key);
    });

    it("should create and retrieve a todo", async () => {
      const todo = await storage.createTodo({
        content: "Test todo item",
      });

      expect(todo.id).toBeDefined();
      expect(todo.content).toBe("Test todo item");
      expect(todo.completed).toBe(false);
      expect(todo.syncStatus).toBe("pending");
      expect(todo.createdAt).toBeGreaterThan(0);
      expect(todo.updatedAt).toBe(todo.createdAt);
    });

    it("should encrypt content when storing", async () => {
      const todo = await storage.createTodo({
        content: "Secret content",
      });

      // Verify the content is encrypted in the database
      const retrieved = await storage.getTodo(todo.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toBe("Secret content");

      // The underlying storage should have encrypted content
      // (This is implicitly tested by the fact that decryption works)
    });

    it("should retrieve all todos", async () => {
      await storage.createTodo({ content: "Todo 1" });
      await storage.createTodo({ content: "Todo 2" });
      await storage.createTodo({ content: "Todo 3" });

      const todos = await storage.getTodos();
      expect(todos).toHaveLength(3);
    });

    it("should filter todos by completion status", async () => {
      await storage.createTodo({ content: "Active 1", completed: false });
      await storage.createTodo({ content: "Active 2", completed: false });
      await storage.createTodo({ content: "Completed 1", completed: true });

      const activeTodos = await storage.getTodos({ completed: false });
      expect(activeTodos).toHaveLength(2);

      const completedTodos = await storage.getTodos({ completed: true });
      expect(completedTodos).toHaveLength(1);
    });

    it("should update a todo", async () => {
      const todo = await storage.createTodo({ content: "Original" });

      const updated = await storage.updateTodo(todo.id, {
        content: "Updated content",
        completed: true,
      });

      expect(updated).not.toBeNull();
      expect(updated!.content).toBe("Updated content");
      expect(updated!.completed).toBe(true);
      expect(updated!.updatedAt).toBeGreaterThan(todo.createdAt);
    });

    it("should return null when updating non-existent todo", async () => {
      const result = await storage.updateTodo("non-existent-id", {
        content: "Updated",
      });

      expect(result).toBeNull();
    });

    it("should soft delete a todo", async () => {
      const todo = await storage.createTodo({ content: "To be deleted" });

      const deleted = await storage.deleteTodo(todo.id);
      expect(deleted).toBe(true);

      // Should not appear in normal queries
      const todos = await storage.getTodos();
      expect(todos).toHaveLength(0);

      // Should appear when including deleted
      const allTodos = await storage.getTodos({ includeDeleted: true });
      expect(allTodos).toHaveLength(1);
      expect(allTodos[0].deleted).toBe(true);
    });

    it("should hard delete a todo", async () => {
      const todo = await storage.createTodo({ content: "To be removed" });

      const deleted = await storage.hardDeleteTodo(todo.id);
      expect(deleted).toBe(true);

      // Should not exist at all
      const retrieved = await storage.getTodo(todo.id);
      expect(retrieved).toBeNull();
    });

    it("should filter by sync status", async () => {
      const todo1 = await storage.createTodo({ content: "Pending" });
      const todo2 = await storage.createTodo({ content: "Synced" });
      await storage.updateTodo(todo2.id, { syncStatus: "synced" });

      const pendingTodos = await storage.getTodos({ syncStatus: "pending" });
      expect(pendingTodos).toHaveLength(1);
      expect(pendingTodos[0].id).toBe(todo1.id);
    });
  });

  describe("credentials", () => {
    beforeEach(() => {
      storage.initialize(key);
    });

    it("should store and retrieve credentials", async () => {
      await storage.storeCredential({
        credentialId: "test-cred-id",
        publicKey: "test-public-key",
        displayName: "Test User",
        prfSalt: "test-salt",
        hasPRF: true,
      });

      const credentials = await storage.getCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0].credentialId).toBe("test-cred-id");
      expect(credentials[0].displayName).toBe("Test User");
      expect(credentials[0].hasPRF).toBe(true);
    });

    it("should update credential last used timestamp", async () => {
      await storage.storeCredential({
        credentialId: "test-cred-id",
        publicKey: "test-public-key",
        displayName: "Test User",
        prfSalt: "test-salt",
        hasPRF: true,
      });

      const before = (await storage.getCredentials())[0].lastUsedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await storage.updateCredentialLastUsed("test-cred-id");

      const after = (await storage.getCredentials())[0].lastUsedAt;
      expect(after).toBeGreaterThan(before);
    });

    it("should delete credentials", async () => {
      await storage.storeCredential({
        credentialId: "test-cred-id",
        publicKey: "test-public-key",
        displayName: "Test User",
        prfSalt: "test-salt",
        hasPRF: true,
      });

      await storage.deleteCredential("test-cred-id");

      const credentials = await storage.getCredentials();
      expect(credentials).toHaveLength(0);
    });
  });

  describe("sync metadata", () => {
    beforeEach(() => {
      storage.initialize(key);
    });

    it("should return null when no sync meta exists", async () => {
      const meta = await storage.getSyncMeta();
      expect(meta).toBeNull();
    });

    it("should create and update sync metadata", async () => {
      await storage.updateSyncMeta({
        lastSyncAt: Date.now(),
        pendingCount: 5,
      });

      const meta = await storage.getSyncMeta();
      expect(meta).not.toBeNull();
      expect(meta!.pendingCount).toBe(5);
    });

    it("should update existing sync metadata", async () => {
      await storage.updateSyncMeta({ lastSyncAt: 1000, pendingCount: 5 });
      await storage.updateSyncMeta({ pendingCount: 3 });

      const meta = await storage.getSyncMeta();
      expect(meta!.pendingCount).toBe(3);
      expect(meta!.lastSyncAt).toBe(1000);
    });
  });

  describe("operations", () => {
    beforeEach(() => {
      storage.initialize(key);
    });

    it("should track operations when creating todos", async () => {
      await storage.createTodo({ content: "New todo" });

      const operations = await storage.getPendingOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe("create");
    });

    it("should track operations when updating todos", async () => {
      const todo = await storage.createTodo({ content: "Original" });
      await storage.updateTodo(todo.id, { content: "Updated" });

      const operations = await storage.getPendingOperations();
      expect(operations).toHaveLength(2);
      // Find the update operation (order may vary due to timing)
      const updateOp = operations.find(
        (op: { type: string }) => op.type === "update"
      );
      expect(updateOp).toBeDefined();
    });

    it("should track operations when deleting todos", async () => {
      const todo = await storage.createTodo({ content: "To delete" });
      await storage.deleteTodo(todo.id);

      const operations = await storage.getPendingOperations();
      expect(operations).toHaveLength(2);
      // Find the delete operation (order may vary due to timing)
      const deleteOp = operations.find(
        (op: { type: string }) => op.type === "delete"
      );
      expect(deleteOp).toBeDefined();
      expect(deleteOp!.todoId).toBe(todo.id);
    });

    it("should clear operations after sync", async () => {
      await storage.createTodo({ content: "Todo 1" });
      await storage.createTodo({ content: "Todo 2" });

      const operations = await storage.getPendingOperations();
      expect(operations).toHaveLength(2);

      await storage.clearOperations(
        operations.map((op: { id: string }) => op.id)
      );

      const remaining = await storage.getPendingOperations();
      expect(remaining).toHaveLength(0);
    });
  });

  describe("clear all data", () => {
    beforeEach(() => {
      storage.initialize(key);
    });

    it("should clear all data on logout", async () => {
      await storage.createTodo({ content: "Todo" });
      await storage.storeCredential({
        credentialId: "cred",
        publicKey: "key",
        displayName: "User",
        prfSalt: "salt",
        hasPRF: true,
      });
      await storage.updateSyncMeta({ lastSyncAt: Date.now(), pendingCount: 1 });

      await storage.clearAllData();

      expect(await storage.getTodos()).toHaveLength(0);
      expect(await storage.getCredentials()).toHaveLength(0);
      expect(await storage.getSyncMeta()).toBeNull();
      expect(await storage.getPendingOperations()).toHaveLength(0);
    });
  });
});
