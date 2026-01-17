import { describe, it, expect, vi } from "vitest";
import { useStable } from "./useStable";
import { isStableFn } from "../core/equality";
import { wrappers } from "./strictModeTest";

describe.each(wrappers)("useStable - $mode", ({ renderHook }) => {
  describe("basic stabilization", () => {
    it("should return stable object reference across renders", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            name: props.name,
            count: props.count,
          }),
        { initialProps: { name: "John", count: 1 } }
      );

      const firstResult = result.current;

      rerender({ name: "John", count: 1 });

      expect(result.current).toBe(firstResult);
    });

    it("should update property when value changes", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            name: props.name,
          }),
        { initialProps: { name: "John" } }
      );

      expect(result.current.name).toBe("John");

      rerender({ name: "Jane" });

      expect(result.current.name).toBe("Jane");
    });
  });

  describe("function stabilization", () => {
    it("should wrap functions in stable wrappers", () => {
      const callback = vi.fn(() => 42);

      const { result } = renderHook(() =>
        useStable({
          callback,
        })
      );

      expect(isStableFn(result.current.callback)).toBe(true);
      expect(result.current.callback()).toBe(42);
      expect(callback).toHaveBeenCalled();
    });

    it("should maintain stable function reference across renders", () => {
      const { result, rerender } = renderHook(
        (props: { callback: () => number }) =>
          useStable({
            callback: props.callback,
          }),
        { initialProps: { callback: () => 1 } }
      );

      const firstCallback = result.current.callback;

      rerender({ callback: () => 2 });

      expect(result.current.callback).toBe(firstCallback);
    });

    it("should call latest function implementation", () => {
      const { result, rerender } = renderHook(
        (props: { callback: () => number }) =>
          useStable({
            callback: props.callback,
          }),
        { initialProps: { callback: () => 1 } }
      );

      expect(result.current.callback()).toBe(1);

      rerender({ callback: () => 2 });

      expect(result.current.callback()).toBe(2);
    });

    it("should handle multiple functions", () => {
      const { result, rerender } = renderHook(
        (props: { onClick: () => string; onSubmit: () => string }) =>
          useStable({
            onClick: props.onClick,
            onSubmit: props.onSubmit,
          }),
        {
          initialProps: {
            onClick: () => "click1",
            onSubmit: () => "submit1",
          },
        }
      );

      const firstOnClick = result.current.onClick;
      const firstOnSubmit = result.current.onSubmit;

      rerender({
        onClick: () => "click2",
        onSubmit: () => "submit2",
      });

      expect(result.current.onClick).toBe(firstOnClick);
      expect(result.current.onSubmit).toBe(firstOnSubmit);
      expect(result.current.onClick()).toBe("click2");
      expect(result.current.onSubmit()).toBe("submit2");
    });
  });

  describe("array stabilization (default: shallow)", () => {
    it("should stabilize array with same items (shallow equal)", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            items: props.items,
          }),
        { initialProps: { items: [1, 2, 3] } }
      );

      const firstItems = result.current.items;

      rerender({ items: [1, 2, 3] });

      expect(result.current.items).toBe(firstItems);
    });

    it("should update array when items change", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            items: props.items,
          }),
        { initialProps: { items: [1, 2, 3] } }
      );

      const firstItems = result.current.items;

      rerender({ items: [1, 2, 4] });

      expect(result.current.items).not.toBe(firstItems);
      expect(result.current.items).toEqual([1, 2, 4]);
    });

    it("should update array when length changes", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            items: props.items,
          }),
        { initialProps: { items: [1, 2, 3] } }
      );

      const firstItems = result.current.items;

      rerender({ items: [1, 2] });

      expect(result.current.items).not.toBe(firstItems);
    });

    it("should work as useEffect dependency", () => {
      const effectFn = vi.fn();

      const { result, rerender } = renderHook(
        (props) => {
          const stable = useStable({
            items: props.items,
          });

          // Simulate useEffect behavior - track if dependency changed
          effectFn(stable.items);

          return stable;
        },
        { initialProps: { items: [1, 2, 3] } }
      );

      const firstItems = result.current.items;

      // Same content - should be stable
      rerender({ items: [1, 2, 3] });

      // Effect should receive same reference
      expect(effectFn).toHaveBeenLastCalledWith(firstItems);
    });
  });

  describe("object stabilization (default: shallow)", () => {
    it("should stabilize object with same shallow values", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            person: props.person,
          }),
        { initialProps: { person: { name: "John", age: 30 } } }
      );

      const firstPerson = result.current.person;

      rerender({ person: { name: "John", age: 30 } });

      expect(result.current.person).toBe(firstPerson);
    });

    it("should update object when shallow values change", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            person: props.person,
          }),
        { initialProps: { person: { name: "John", age: 30 } } }
      );

      const firstPerson = result.current.person;

      rerender({ person: { name: "Jane", age: 30 } });

      expect(result.current.person).not.toBe(firstPerson);
    });

    it("should NOT stabilize nested objects by default (shallow comparison)", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            data: props.data,
          }),
        {
          initialProps: {
            data: { nested: { value: 1 } },
          },
        }
      );

      const firstData = result.current.data;

      // Different nested object reference, even with same content
      rerender({ data: { nested: { value: 1 } } });

      // Should NOT be stable because nested object has different reference
      expect(result.current.data).not.toBe(firstData);
    });
  });

  describe("Date stabilization (default: deep/timestamp)", () => {
    it("should stabilize Date with same timestamp", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            date: props.date,
          }),
        { initialProps: { date: new Date("2024-01-01") } }
      );

      const firstDate = result.current.date;

      rerender({ date: new Date("2024-01-01") });

      expect(result.current.date).toBe(firstDate);
    });

    it("should update Date when timestamp changes", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            date: props.date,
          }),
        { initialProps: { date: new Date("2024-01-01") } }
      );

      const firstDate = result.current.date;

      rerender({ date: new Date("2024-01-02") });

      expect(result.current.date).not.toBe(firstDate);
    });
  });

  describe("primitive stabilization (default: strict)", () => {
    it("should stabilize primitives with strict equality", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            count: props.count,
            name: props.name,
            active: props.active,
          }),
        { initialProps: { count: 42, name: "test", active: true } }
      );

      const firstResult = result.current;

      rerender({ count: 42, name: "test", active: true });

      expect(result.current).toBe(firstResult);
      expect(result.current.count).toBe(42);
      expect(result.current.name).toBe("test");
      expect(result.current.active).toBe(true);
    });
  });

  describe("custom equals option", () => {
    it("should use custom equals for specified properties", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable(
            {
              data: props.data,
            },
            { data: "deep" }
          ),
        {
          initialProps: {
            data: { nested: { value: 1 } },
          },
        }
      );

      const firstData = result.current.data;

      // With deep equals, nested objects with same content should be stable
      rerender({ data: { nested: { value: 1 } } });

      expect(result.current.data).toBe(firstData);
    });

    it("should override default equals", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable(
            {
              items: props.items,
            },
            { items: "strict" }
          ),
        { initialProps: { items: [1, 2, 3] } }
      );

      const firstItems = result.current.items;

      // With strict equals, same content but different reference should NOT be stable
      rerender({ items: [1, 2, 3] });

      expect(result.current.items).not.toBe(firstItems);
    });

    it("should support custom equals function", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable(
            {
              user: props.user,
            },
            { user: (a, b) => a?.id === b?.id }
          ),
        { initialProps: { user: { id: 1, name: "John" } } }
      );

      const firstUser = result.current.user;

      // Same id, different name - should be stable with custom equals
      rerender({ user: { id: 1, name: "Jane" } });

      expect(result.current.user).toBe(firstUser);

      // Different id - should NOT be stable
      rerender({ user: { id: 2, name: "Jane" } });

      expect(result.current.user).not.toBe(firstUser);
    });

    it("should ignore equals option for functions", () => {
      const { result, rerender } = renderHook(
        (props: { callback: () => number }) =>
          useStable(
            {
              callback: props.callback,
            },
            // Functions are excluded from equals type, so this is ignored at runtime
            { callback: "deep" } as any
          ),
        { initialProps: { callback: () => 1 } }
      );

      const firstCallback = result.current.callback;

      rerender({ callback: () => 2 });

      // Function should still be stabilized regardless of equals option
      expect(result.current.callback).toBe(firstCallback);
      expect(isStableFn(result.current.callback)).toBe(true);
    });
  });

  describe("mixed properties", () => {
    it("should handle mixed property types correctly", () => {
      type Props = {
        person: { name: string; address: { city: string } };
        date: Date;
        items: number[];
        callback: () => string;
        count: number;
      };

      const { result, rerender } = renderHook(
        (props: Props) =>
          useStable(
            {
              person: props.person,
              date: props.date,
              items: props.items,
              callback: props.callback,
              count: props.count,
            },
            { person: "deep" }
          ),
        {
          initialProps: {
            person: { name: "John", address: { city: "NYC" } },
            date: new Date("2024-01-01"),
            items: [1, 2, 3],
            callback: () => "hello",
            count: 42,
          },
        }
      );

      const first = {
        person: result.current.person,
        date: result.current.date,
        items: result.current.items,
        callback: result.current.callback,
        count: result.current.count,
      };

      // Rerender with same logical values but new references
      rerender({
        person: { name: "John", address: { city: "NYC" } },
        date: new Date("2024-01-01"),
        items: [1, 2, 3],
        callback: () => "world",
        count: 42,
      });

      // person: deep equals - should be stable
      expect(result.current.person).toBe(first.person);

      // date: timestamp comparison - should be stable
      expect(result.current.date).toBe(first.date);

      // items: shallow equals - should be stable
      expect(result.current.items).toBe(first.items);

      // callback: always stabilized - should be stable reference
      expect(result.current.callback).toBe(first.callback);

      // count: strict equals - should be stable
      expect(result.current.count).toBe(first.count);

      // But callback should call new implementation
      expect(result.current.callback()).toBe("world");
    });
  });

  describe("edge cases", () => {
    it("should handle null values", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            value: props.value,
          }),
        { initialProps: { value: null as string | null } }
      );

      expect(result.current.value).toBe(null);

      rerender({ value: "hello" });

      expect(result.current.value).toBe("hello");

      rerender({ value: null });

      expect(result.current.value).toBe(null);
    });

    it("should handle undefined values", () => {
      const { result, rerender } = renderHook(
        (props) =>
          useStable({
            value: props.value,
          }),
        { initialProps: { value: undefined as string | undefined } }
      );

      expect(result.current.value).toBe(undefined);

      rerender({ value: "hello" });

      expect(result.current.value).toBe("hello");
    });

    it("should handle empty object", () => {
      const { result } = renderHook(() => useStable({}));

      expect(result.current).toEqual({});
    });

    it("should handle adding new properties on rerender", () => {
      const { result, rerender } = renderHook((props) => useStable(props), {
        initialProps: { a: 1 } as { a: number; b?: number },
      });

      expect(result.current.a).toBe(1);
      expect(result.current.b).toBeUndefined();

      rerender({ a: 1, b: 2 });

      expect(result.current.a).toBe(1);
      expect(result.current.b).toBe(2);
    });
  });

  describe("type safety", () => {
    it("should preserve property types", () => {
      const { result } = renderHook(() =>
        useStable({
          name: "John",
          age: 30,
          items: [1, 2, 3],
          callback: (x: number) => x * 2,
        })
      );

      // TypeScript should infer these types correctly
      const name: string = result.current.name;
      const age: number = result.current.age;
      const items: number[] = result.current.items;
      const doubled: number = result.current.callback(5);

      expect(name).toBe("John");
      expect(age).toBe(30);
      expect(items).toEqual([1, 2, 3]);
      expect(doubled).toBe(10);
    });
  });
});
