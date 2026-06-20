from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scraper.moe_p1 import DEFAULT_OUTPUT_DIR, refresh_artifacts


def main() -> int:
    manifest = refresh_artifacts(DEFAULT_OUTPUT_DIR)
    print(json.dumps(manifest, indent=2))
    print(f"Artifacts written to {Path(DEFAULT_OUTPUT_DIR).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
