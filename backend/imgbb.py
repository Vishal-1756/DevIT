import base64
import requests
import logging

logger = logging.getLogger(__name__)

IMGBB_API_KEYS = [
]

def upload_image_to_imgbb(image_bytes: bytes) -> str:
    """Upload image to imgbb and return URL"""
    
    try:
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        
        
        for api_key in IMGBB_API_KEYS:
            try:
                logger.info(f"Attempting upload with API key ending in {api_key[-6:]}")
                response = requests.post(
                    "https://api.imgbb.com/1/upload",
                    data={"key": api_key, "image": encoded_image},
                    timeout=15
                )
                
                
                logger.info(f"ImgBB response status: {response.status_code}")
                
                data = response.json()
                if response.status_code == 200 and data.get("success"):
                    logger.info("Image uploaded successfully")
                    return data["data"]["url"]
                else:
                    logger.error(f"ImgBB error response: {data}")
            except Exception as e:
                logger.error(f"ImgBB upload failed with key {api_key[-6:]}: {e}")
                continue
                
        
        raise Exception("All ImgBB upload attempts failed")
    except Exception as e:
        logger.error(f"General error in upload_image_to_imgbb: {e}")

        raise Exception(f"Image upload failed: {str(e)}")
