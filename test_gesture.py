import unittest

from gesture import StringGesture


def hand(x, closed=True):
    points = [(x, .5)] * 21
    points[0], points[9] = (x, .7), (x, .45)
    points[4], points[8] = (x, .45), (x + (.01 if closed else .18), .45)
    return points


class PlacementTest(unittest.TestCase):
    def setUp(self):
        self.gesture = StringGesture()

    def step(self, t, right=.45, closed=True):
        return self.gesture.step([hand(.3), hand(right, closed)], 4/3, t)

    def test_release_uses_last_held_endpoints_once(self):
        self.assertEqual(self.step(0)["action"], "wait")
        self.assertEqual(self.step(.2, .65)["action"], "wait")
        self.assertEqual(self.step(.28, .65)["action"], "preview")
        self.gesture.step([], 4/3, .30)
        self.assertEqual(self.step(.34, .66)["action"], "preview")
        last = self.step(.40, .66, False)["ends"]
        placed = self.step(.52, .66, False)
        self.assertEqual(placed["action"], "place")
        self.assertEqual(placed["ends"], last)
        self.assertEqual(self.step(.7, .66, False)["action"], "wait")

    def test_loss_cancels_without_placing_or_reusing_span(self):
        self.step(0)
        self.step(.15, .7)
        self.assertEqual(self.gesture.step([], 1, .50)["action"], "cancel")
        self.assertEqual(self.gesture.step([], 4/3, .55)["action"], "wait")
        self.assertEqual(self.step(.65, .7)["action"], "wait")

    def test_one_pinch_cannot_start_a_string(self):
        for t, x in enumerate((.3, .45, .6)):
            for hands in ([hand(x)], [hand(x), hand(.85, False)]):
                self.assertEqual(self.gesture.step(hands, 1, t)["action"], "wait")
                self.assertIsNone(self.gesture.ends)

    def test_pull_is_relative_to_when_both_pinches_closed(self):
        for t, hands in [
            (0, [hand(.2), hand(.5, False)]),
            (.1, [hand(.2), hand(.7)]),
            (.2, [hand(.71), hand(.21)]),
            (.3, [hand(.2), hand(.71, False)]),
            (.4, [hand(.2), hand(.75)]),
        ]:
            self.assertEqual(self.gesture.step(hands, 1, t)["action"], "wait")
        self.gesture.step([hand(.83), hand(.18)], 1, .5)
        result = self.gesture.step([hand(.91), hand(.14)], 1, .67)
        self.assertEqual(result["action"], "preview")
        self.assertGreater(result["ends"][0]["x"], result["ends"][1]["x"])

    def test_consecutive_placements_across_browser_resets(self):
        for start in (0, 1, 2):
            self.assertEqual(self.step(start)["action"], "wait")
            self.assertEqual(self.step(start + .26, .65)["action"], "preview")
            self.step(start + .3, .65, False)
            self.assertEqual(self.step(start + .42, .65, False)["action"], "place")
            self.gesture.reset()


    def test_small_motion_and_brief_touch_never_form_strings(self):
        for t, x in [(0, .45), (.1, .49), (.25, .50), (.4, .51)]:
            self.assertEqual(self.step(t, x)["action"], "wait")
        self.assertEqual(self.step(.55, .51, False)["action"], "wait")
        self.assertIsNone(self.gesture.ends)
        self.gesture.reset()
        self.step(0)
        self.assertEqual(self.step(.1, .65)["action"], "wait")
        self.assertEqual(self.step(.15, .65, False)["action"], "wait")
        self.assertFalse(self.gesture.placed)
