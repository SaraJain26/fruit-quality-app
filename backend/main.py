from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import numpy as np
import cv2
from PIL import Image
import io
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for local demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- LOGIN ----------

class LoginRequest(BaseModel):
    email: str
    password: str
    remember: bool | None = False

class LoginResponse(BaseModel):
    token: str
    user: Dict[str, str]
    message: str

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    # Demo: accept any email + password length >= 6
    if len(payload.password) < 6:
        # FastAPI error will be turned into JSON 422 by frontend
        raise ValueError("Password must be at least 6 characters")

    token = f"demo_token_{random.randint(100000, 999999)}"
    user = {"name": payload.email.split("@")[0], "email": payload.email}
    return LoginResponse(token=token, user=user, message="Login successful")


# ---------- IMAGE ANALYSIS HELPERS ----------

def compute_freshness_from_image(img_rgb: np.ndarray, k: int = 3):
    """Return (freshness_score 0–100, spoilage_ratio 0–100) via K-means in Lab."""
    img_lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    h, w, _ = img_lab.shape
    pixels = img_lab.reshape(-1, 3).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        pixels, k, None, criteria, 5, cv2.KMEANS_PP_CENTERS
    )
    labels = labels.flatten()
    centers = centers.astype(np.float32)
    L = centers[:, 0]
    a = centers[:, 1]

    fresh_cluster = int(np.argmax(a))      # red / fresh
    spoiled_cluster = int(np.argmin(L))    # dark / spoiled

    fresh_pixels = int((labels == fresh_cluster).sum())
    spoiled_pixels = int((labels == spoiled_cluster).sum())
    total_pixels = int(labels.size)

    apple_pixels = fresh_pixels + spoiled_pixels
    if apple_pixels < 0.05 * total_pixels:
        return 60, 30

    fresh_ratio = fresh_pixels / apple_pixels
    spoiled_ratio = spoiled_pixels / apple_pixels
    return int(100 * fresh_ratio), int(100 * spoiled_ratio)


def spoilage_risk_label_from_ratio(spoilage_ratio: int) -> str:
    if spoilage_ratio <= 25:
        return "Low"
    elif spoilage_ratio <= 50:
        return "Medium"
    else:
        return "High"


def dry_matter_from_freshness(freshness: int) -> float:
    freshness = max(0, min(100, freshness))
    return round(10.0 + 0.08 * freshness, 1)   # ~10–18 %


def estimate_weight_from_image(img_rgb: np.ndarray) -> float:
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return round(random.uniform(0.15, 0.30), 2)
    c = max(contours, key=cv2.contourArea)
    ((x, y), radius) = cv2.minEnclosingCircle(c)
    radius = max(radius, 10)
    weight = 0.0015 * (radius ** 1.2)
    return round(float(weight), 2)


def pesticide_class_demo() -> str:
    return random.choice(["Pure", "Insecticide Low", "Fungicide Low", "Fungicide High"])


def nutrition_from_dm(dm: float) -> Dict[str, float]:
    dm_factor = (dm - 14.0) / 4.0
    water = 86.0 - 2.0 * dm_factor
    sugar = 10.0 + 1.0 * dm_factor
    fiber = 2.4 + 0.3 * dm_factor
    vit_c = 4.6 - 0.5 * max(dm_factor, 0)
    return {
        "water_percent": round(max(70.0, min(90.0, water)), 1),
        "sugar_percent": round(max(5.0, min(20.0, sugar)), 1),
        "fiber": round(max(1.0, min(5.0, fiber)), 1),
        "vitamin_c_mg": round(max(1.0, min(8.0, vit_c)), 1),
    }


def spectral_curve_demo() -> List[float]:
    base = [np.sin(i / 5) * 20 + 50 for i in range(50)]
    noise = np.random.normal(0, 3, size=50)
    return [round(float(b + n), 2) for b, n in zip(base, noise)]


def sensor_values_demo() -> List[int]:
    return [int(random.uniform(5000, 35000)) for _ in range(18)]


# ---------- ANALYZE ENDPOINT ----------

@app.post("/api/analyze/apple")
async def analyze_apple(image: UploadFile = File(...)):
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img_rgb = np.array(img)

    freshness, spoilage_ratio = compute_freshness_from_image(img_rgb)
    dm = dry_matter_from_freshness(freshness)
    spoilage_label = spoilage_risk_label_from_ratio(spoilage_ratio)
    weight = estimate_weight_from_image(img_rgb)
    pesticide = pesticide_class_demo()
    nutrition = nutrition_from_dm(dm)
    spectral = spectral_curve_demo()
    sensor_vals = sensor_values_demo()

    return {
        "freshness_score": freshness,
        "dry_matter_percent": dm,
        "spoilage_risk": spoilage_label,
        "pesticide_class": pesticide,
        "estimated_weight_kg": weight,
        "nutrition": nutrition,
        "spectral_prediction_graph_data": spectral,
        "sensor_emulation_values": sensor_vals,
    }
