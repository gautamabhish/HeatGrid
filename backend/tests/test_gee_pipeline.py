import unittest
from unittest.mock import patch, MagicMock
from services.gee_pipeline import get_gee_data
import os

class TestGeePipeline(unittest.IsolatedAsyncioTestCase):
    @patch('services.gee_pipeline.ee')
    @patch('services.gee_pipeline.ox')
    @patch('services.gee_pipeline.service_account')
    async def test_get_gee_data_mocked(self, mock_service_account, mock_ox, mock_ee):
        # Mock osmnx geocode
        mock_bbox = MagicMock()
        mock_bbox.total_bounds = [-122.4, 37.7, -122.3, 37.8]
        mock_ox.geocode_to_gdf.return_value = mock_bbox
        
        # Mock ee returning data
        class MockImage:
            def reduceRegion(self, **kwargs):
                m = MagicMock()
                m.getInfo.return_value = {'LST_Day_1km': 35.5, 'NDVI': 0.45}
                return m
            def getMapId(self, vis):
                return {'tile_fetcher': MagicMock(url_format="http://mock-url")}
                
        mock_image_instance = MockImage()
        
        # We need to mock the entire chain: dataset_lst.mean().multiply(0.02).subtract().clip()
        mock_dataset = MagicMock()
        mock_dataset.filterDate.return_value.select.return_value.mean.return_value.multiply.return_value.subtract.return_value.clip.return_value = mock_image_instance
        mock_dataset.filterDate.return_value.select.return_value.mean.return_value.multiply.return_value.clip.return_value = mock_image_instance
        
        mock_ee.ImageCollection.return_value = mock_dataset
        
        os.environ['GEE_CREDENTIALS_PATH'] = 'dummy/path'
        
        # Test
        data = await get_gee_data('San Francisco')
        
        self.assertEqual(data['avg_lst_celsius'], 35.5)
        self.assertEqual(data['avg_ndvi'], 0.45)
        self.assertEqual(data['layers']['heatmap_url'], "http://mock-url")
        self.assertEqual(data['layers']['ndvi_url'], "http://mock-url")

if __name__ == '__main__':
    unittest.main()
