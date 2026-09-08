import os
import cv2
import numpy as np

def generate_mine_blueprint(output_path: str):
    width, height = 1000, 700
    # Blueprint navy blue background
    img = np.full((height, width, 3), (40, 20, 10), dtype=np.uint8)

    # 1. Subtle grid lines
    grid_color = (65, 35, 20)
    for x in range(0, width, 40):
        cv2.line(img, (x, 0), (x, height), grid_color, 1)
    for y in range(0, height, 40):
        cv2.line(img, (0, y), (width, y), grid_color, 1)

    # Border
    cv2.rectangle(img, (15, 15), (width - 15, height - 15), (180, 140, 80), 2)
    cv2.rectangle(img, (20, 20), (width - 20, height - 20), (120, 90, 50), 1)

    # Blueprint Title Block in bottom right
    tb_x, tb_y = width - 320, height - 90
    cv2.rectangle(img, (tb_x, tb_y), (width - 25, height - 25), (60, 40, 20), -1)
    cv2.rectangle(img, (tb_x, tb_y), (width - 25, height - 25), (200, 160, 100), 1)
    cv2.putText(img, "SILVER PEAK MINING CORP", (tb_x + 10, tb_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 240), 1)
    cv2.putText(img, "LEVEL 4 - EXTRACTION SECTOR PLAN", (tb_x + 10, tb_y + 38), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 200), 1)
    cv2.putText(img, "SCALE: 1:500 | SURVEY REF: M-409", (tb_x + 10, tb_y + 54), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (140, 140, 160), 1)

    wall_color = (255, 255, 255)
    wall_thickness = 4
    tunnel_color = (200, 220, 255)

    # Chamber A (North Drift Stope)
    cv2.rectangle(img, (310, 50), (450, 130), (25, 15, 10), -1)
    cv2.rectangle(img, (310, 50), (450, 130), wall_color, wall_thickness)
    cv2.putText(img, "BLOCK A", (345, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Junction 1 Hub
    cv2.circle(img, (380, 190), 22, (50, 30, 15), -1)
    cv2.circle(img, (380, 190), 22, wall_color, 2)
    cv2.putText(img, "J1", (372, 196), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    # Tunnel Block A to J1
    cv2.line(img, (380, 130), (380, 168), tunnel_color, 6)

    # Chamber B (West Seam)
    cv2.rectangle(img, (120, 230), (260, 310), (25, 15, 10), -1)
    cv2.rectangle(img, (120, 230), (260, 310), wall_color, wall_thickness)
    cv2.putText(img, "BLOCK B", (155, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Tunnel J1 to Block B
    cv2.line(img, (360, 205), (260, 260), tunnel_color, 6)

    # Chamber C (East Stope)
    cv2.rectangle(img, (500, 230), (640, 310), (25, 15, 10), -1)
    cv2.rectangle(img, (500, 230), (640, 310), wall_color, wall_thickness)
    cv2.putText(img, "BLOCK C", (535, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Tunnel J1 to Block C
    cv2.line(img, (400, 205), (500, 260), tunnel_color, 6)

    # Junction 2 (South Haulage Hub)
    cv2.circle(img, (190, 380), 20, (50, 30, 15), -1)
    cv2.circle(img, (190, 380), 20, wall_color, 2)
    cv2.putText(img, "J2", (182, 386), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    # Tunnel Block B to J2
    cv2.line(img, (190, 310), (190, 360), tunnel_color, 6)

    # Exit 1 (South Portal)
    cv2.rectangle(img, (140, 460), (240, 520), (20, 80, 40), -1)
    cv2.rectangle(img, (140, 460), (240, 520), (50, 220, 100), 3)
    cv2.putText(img, "EXIT 1", (162, 495), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Tunnel J2 to Exit 1
    cv2.line(img, (190, 400), (190, 460), tunnel_color, 6)

    # Exit 2 (East Ventilation Portal)
    cv2.rectangle(img, (520, 460), (620, 520), (20, 80, 40), -1)
    cv2.rectangle(img, (520, 460), (620, 520), (50, 220, 100), 3)
    cv2.putText(img, "EXIT 2", (542, 495), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Tunnel Block C to Exit 2
    cv2.line(img, (570, 310), (570, 460), tunnel_color, 6)

    # Refuge Pod Alpha
    cv2.circle(img, (450, 340), 25, (20, 50, 90), -1)
    cv2.circle(img, (450, 340), 25, (220, 180, 50), 3)
    cv2.putText(img, "REFUGE", (426, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)

    # Tunnel J1 to Refuge
    cv2.line(img, (395, 205), (440, 320), tunnel_color, 6)

    # Compass Rose / North Indicator
    cx, cy = 70, 80
    cv2.circle(img, (cx, cy), 30, (150, 120, 60), 1)
    cv2.line(img, (cx, cy + 28), (cx, cy - 28), (220, 200, 140), 2)
    cv2.line(img, (cx - 28, cy), (cx + 28, cy), (220, 200, 140), 1)
    cv2.putText(img, "N", (cx - 6, cy - 34), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, img)
    print(f"Generated sample mine blueprint at: {output_path}")

if __name__ == "__main__":
    generate_mine_blueprint("data/demo/demo_mine_blueprint.png")
