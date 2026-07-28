import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "./NotificationCenter";
import { notificationService } from "@/services/notificationService";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

let intersectionCallback: IntersectionObserverCallback;

function notification(id: string, lastOccurredAt: string) {
  return {
    id,
    userId: "user-1",
    type: "SYSTEM" as const,
    title: `Notification ${id}`,
    message: "Message",
    isRead: true,
    referenceId: null,
    referenceType: null,
    deduplicationKey: `key-${id}`,
    dismissedAt: null,
    resolvedAt: null,
    lastOccurredAt,
    createdAt: lastOccurredAt,
    updatedAt: lastOccurredAt,
  };
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
        intersectionCallback = callback;
        return { observe: vi.fn(), disconnect: vi.fn() };
      }),
    );
  });

  it("loads older notifications when the infinite-scroll sentinel is reached", async () => {
    (notificationService.getNotifications as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        items: [notification("recent", "2026-07-28T10:00:00.000Z")],
        nextCursor: "older-cursor",
        hasNextPage: true,
        unreadCount: 0,
      })
      .mockResolvedValueOnce({
        items: [notification("older", "2026-01-01T10:00:00.000Z")],
        nextCursor: null,
        hasNextPage: false,
        unreadCount: 0,
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationCenter />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Notification recent")).toBeInTheDocument();
    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() =>
      expect(screen.getByText("Notification older")).toBeInTheDocument(),
    );
    expect(notificationService.getNotifications).toHaveBeenLastCalledWith({
      includeRead: true,
      limit: 50,
      cursor: "older-cursor",
    });
  });
});
