"""Face detection — model loading and face detection with multiple backends."""

from __future__ import annotations

import cv2
import numpy as np
from typing import List, Dict, Optional

from app.config import settings
from app.utils.logging import logger

# Module-level model reference (lazy-loaded)
_detector = None
_detector_name = None


def _load_detector() -> bool:
    """Lazy-load the best available face detector. Returns True if loaded."""
    global _detector, _detector_name

    if _detector is not None:
        return True

    # 1) InsightFace
    try:
        import insightface
        from insightface.app import FaceAnalysis
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        _detector = app
        _detector_name = "insightface"
        logger.info("Detector: InsightFace buffalo_l")
        return True
    except ImportError:
        logger.info("InsightFace not installed")
    except Exception as e:
        logger.warning(f"InsightFace init failed: {e}")

    # 2) face_recognition
    try:
        import face_recognition  # noqa: F401
        _detector = "face_recognition"
        _detector_name = "face_recognition"
        logger.info("Detector: face_recognition (dlib)")
        return True
    except ImportError:
        logger.info("face_recognition not installed")

    # 3) OpenCV DNN
    try:
        mf = cv2.data.findFile("res10_300x300_ssd_iter_140000.caffemodel")
        cf = cv2.data.findFile("deploy.prototxt")
        if mf and cf:
            _detector = cv2.dnn.readNetFromCaffe(str(cf), str(mf))
            _detector_name = "opencv-dnn"
            logger.info("Detector: OpenCV DNN SSD")
            return True
    except Exception:
        pass

    # 4) Haar cascade
    try:
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        if not cascade.empty():
            _detector = cascade
            _detector_name = "haar-cascade"
            logger.info("Detector: Haar cascade")
            return True
    except Exception:
        pass

    _detector = "noop"
    _detector_name = "none"
    logger.warning("No face detector available — NOOP")
    return False


def detector_name() -> str:
    _load_detector()
    return _detector_name or "none"


def detect_faces(frame: np.ndarray) -> List[Dict]:
    """Detect faces in a BGR frame.

    Returns list: {box:(x,y,w,h), confidence:float, landmarks:Optional[list]}
    """
    _load_detector()
    results = []
    h, w = frame.shape[:2]

    if _detector_name == "insightface":
        try:
            for face in _detector.get(frame):
                bbox = face.bbox.astype(int)
                x1, y1 = max(0, bbox[0]), max(0, bbox[1])
                x2, y2 = min(w, bbox[2]), min(h, bbox[3])
                if x2 > x1 and y2 > y1:
                    results.append({
                        "box": (x1, y1, x2 - x1, y2 - y1),
                        "confidence": float(face.det_score),
                        "landmarks": face.landmark.tolist()
                        if face.landmark is not None else None,
                    })
            return results
        except Exception as e:
            logger.warning(f"InsightFace detect failed: {e}")

    if _detector_name == "face_recognition":
        try:
            import face_recognition
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            for top, right, bottom, left in face_recognition.face_locations(rgb):
                results.append({
                    "box": (left, top, right - left, bottom - top),
                    "confidence": 1.0,
                    "landmarks": None,
                })
            return results
        except Exception as e:
            logger.warning(f"face_recognition detect failed: {e}")

    if _detector_name == "opencv-dnn":
        try:
            blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), (104, 177, 123))
            _detector.setInput(blob)
            detections = _detector.forward()
            for i in range(detections.shape[2]):
                conf = detections[0, 0, i, 2]
                if conf > 0.5:
                    x1 = max(0, int(detections[0, 0, i, 3] * w))
                    y1 = max(0, int(detections[0, 0, i, 4] * h))
                    x2 = min(w, int(detections[0, 0, i, 5] * w))
                    y2 = min(h, int(detections[0, 0, i, 6] * h))
                    if x2 > x1 and y2 > y1:
                        results.append({
                            "box": (x1, y1, x2 - x1, y2 - y1),
                            "confidence": float(conf),
                            "landmarks": None,
                        })
            return results
        except Exception as e:
            logger.warning(f"OpenCV DNN detect failed: {e}")

    if isinstance(_detector, cv2.CascadeClassifier):
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            for (x, y, bw, bh) in _detector.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5,
                minSize=(settings.MIN_FACE_SIZE, settings.MIN_FACE_SIZE),
            ):
                results.append({
                    "box": (x, y, bw, bh),
                    "confidence": 1.0,
                    "landmarks": None,
                })
            return results
        except Exception as e:
            logger.warning(f"Haar detect failed: {e}")

    return results