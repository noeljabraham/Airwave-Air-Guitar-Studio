"""Recognize a string drawn with two thumb-index pinches and an outward pull."""
from itertools import permutations
from math import hypot


class StringGesture:
    def __init__(self):
        self.reset()

    def reset(self):
        self.wrists = []
        self.ends = self.start_span = None
        self.last_seen = self.released = None
        self.placed = False
        self.pinched_at = None

    def step(self, hands, aspect, now):
        def distance(a, b):
            return hypot(a[0] - b[0], (a[1] - b[1]) / aspect)

        def closed(hand, threshold):
            palm = max(distance(hand[0], hand[9]), distance(hand[5], hand[17]))
            return distance(hand[4], hand[8]) < palm * threshold

        def grip(hand):
            return tuple((a + b) / 2 for a, b in zip(hand[4], hand[8]))

        if self.placed:
            return {"action": "wait"}
        if self.last_seen is not None and now - self.last_seen > .30:
            self.reset()
            return {"action": "cancel", "hint": "Pinch with both hands to start again"}

        if len(hands) != 2:
            self.released = None
            if self.ends is None:
                self.reset()
            return {"action": "wait", "hint": "Show both hands and pinch thumb to index on each"}

        active = hands
        if self.wrists:
            # Keep each endpoint attached to its hand when detector order changes.
            active = min(permutations(hands),
                         key=lambda pair: sum(distance(h[0], w) for h, w in zip(pair, self.wrists)))
            if any(distance(h[0], w) > .25 for h, w in zip(active, self.wrists)):
                self.reset()
                return {"action": "cancel", "hint": "Pinch with both hands to start again"}

        if all(closed(h, .40 if self.wrists else .23) for h in active):
            grips = [grip(h) for h in active]
            span = distance(*grips)
            self.wrists = [h[0] for h in active]
            self.last_seen, self.released = now, None
            if self.start_span is None:
                self.start_span = span
                self.pinched_at = now
            pull_distance = max(.10, .65 * max(distance(h[0], h[9]) for h in active))
            if self.ends is None and (now - self.pinched_at < .25 or span - self.start_span < pull_distance):
                return {"action": "wait", "hint": "Hold both pinches briefly, then pull your hands farther apart"}
            self.ends = grips
            return self.result("preview", "Open either pinch to leave the string here")

        if self.ends is None:
            self.reset()
            return {"action": "wait", "hint": "Touch thumb to index on both hands"}
        self.last_seen = now
        if self.released is None:
            self.released = now
        if now - self.released < .10:
            return self.result("preview", "Release to place")
        if distance(*self.ends) < .055:
            self.reset()
            return {"action": "cancel", "hint": "Pinch again and pull farther apart"}
        self.placed = True
        return self.result("place", "String placed")

    def result(self, action, hint):
        return {"action": action, "hint": hint,
                "ends": [{"x": 1 - x, "y": y} for x, y in self.ends]}
