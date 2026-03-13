import unittest
import os
from pydantic import BaseModel
from services.ai_engine import generate_recommendations

class InterventionModel(BaseModel):
    type: str
    target: str
    impact_estimate: str
    cost_estimate: str
    roi_score: int
    narrative: str

class TestAiEngine(unittest.IsolatedAsyncioTestCase):
    async def test_fallback_recommendations_schema(self):
        gee_data = {"avg_lst_celsius": 35.0} # High heat
        
        # High pedestrian flow proxy, low svf (dense) -> Misting & Reflective Roofs
        osm_data = {
            "center": [-122.4, 37.7],
            "buildings": {"features": [
                {"properties": {"pedestrian_proxy": 10, "svf": 0.2, "roof_type": "dark"}}
            ] * 60},
            "roads": {"features": [{}] * 10},
            "parks": {"features": []}
        }
        
        # Unset API key to force fallback rule-based engine
        if "GEMINI_API_KEY" in os.environ:
            os.environ.pop("GEMINI_API_KEY")
            
        recs = await generate_recommendations(gee_data, osm_data)
        
        print("Generated Recommendations:", recs)
        
        validated = [InterventionModel(**r) for r in recs]
        self.assertTrue(len(validated) > 0)
        self.assertEqual(validated[0].roi_score, 20) # Misting station expected to be highest
        
if __name__ == '__main__':
    unittest.main()
