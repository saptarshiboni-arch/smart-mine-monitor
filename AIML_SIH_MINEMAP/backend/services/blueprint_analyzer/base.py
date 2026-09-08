from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BlueprintAnalyzer(ABC):
    """
    Abstract perception base class for mine blueprint understanding.
    Allows swappable engines: CubiCasaAnalyzer (pretrained floorplan foundation)
    and future MineBlueprintAnalyzer (fine-tuned on subterranean mine surveys).
    """

    @abstractmethod
    def analyze(self, file_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processes a mine blueprint image or PDF.
        Returns extracted structural geometry, segmented regions, walls,
        openings, corridors, confidence scores, and uncertainty flags.
        """
        pass

    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Returns metadata about the perception model, architecture, and training source."""
        pass
