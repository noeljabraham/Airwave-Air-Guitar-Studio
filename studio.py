"""Serve the Airwave studio and track each camera session on this computer."""
import asyncio
from pathlib import Path
from time import monotonic

import cv2
import mediapipe as mp
import numpy as np
from aiohttp import WSMsgType, web

from gesture import StringGesture

ROOT = Path(__file__).resolve().parent


def detect(model, jpeg):
    image = cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid camera frame")
    result = model.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    hands = [[(p.x, p.y) for p in hand.landmark] for hand in result.multi_hand_landmarks or []]
    return hands, image.shape[1] / image.shape[0]


async def tracking(request):
    origin = request.headers.get("Origin")
    if request.host not in {"127.0.0.1:8011", "localhost:8011"} or origin != f"http://{request.host}":
        raise web.HTTPForbidden()
    ws = web.WebSocketResponse(max_msg_size=512 * 1024)
    await ws.prepare(request)
    gesture = StringGesture()
    try:
        with mp.solutions.hands.Hands(max_num_hands=2, model_complexity=1,
                                      min_detection_confidence=.6, min_tracking_confidence=.6) as model:
            async for message in ws:
                if message.type == WSMsgType.TEXT and message.data == "reset":
                    gesture.reset()
                elif message.type == WSMsgType.BINARY and len(message.data) > 1:
                    draw = message.data[0]
                    hands, aspect = await asyncio.to_thread(detect, model, message.data[1:])
                    event = gesture.step(hands, aspect, monotonic()) if draw else {"action": "wait"}
                    await ws.send_json({"hands": hands, **event})
                else:
                    break
    except (ValueError, RuntimeError, cv2.error) as error:
        print(f"Camera tracking error: {error}", flush=True)
        await ws.close(code=1011, message=b"Camera tracking failed")
    return ws


async def asset(request):
    return web.FileResponse(ROOT / (request.match_info.get("name") or "index.html"),
                            headers={"Cache-Control": "no-cache"})


def app():
    server = web.Application()
    server.router.add_get("/track", tracking)
    server.router.add_get("/", asset)
    server.router.add_get(r"/{name:index\.html|app\.mjs|instrument\.mjs|string-renderer\.mjs|style\.css}", asset)
    return server


if __name__ == "__main__":
    web.run_app(app(), host="127.0.0.1", port=8011)
